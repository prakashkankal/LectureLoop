import OpenAI from 'openai';
import youtubeDl from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

// Groq's upload limit with a small safety margin
const GROQ_MAX_AUDIO_BYTES = 23_000_000; // 23 MB (limit is 25 MB)
// Duration of each chunk when splitting long videos (10 minutes)
const CHUNK_DURATION_SECS = 600;

function formatTimestamp(seconds) {
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  const minuteLabel = String(minutes).padStart(2, '0');
  return hours
    ? `${String(hours).padStart(2, '0')}:${minuteLabel}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minuteLabel}:${String(remainingSeconds).padStart(2, '0')}`;
}

/** Get video duration in seconds via yt-dlp JSON dump. Returns null on failure. */
async function getVideoDuration(videoId) {
  try {
    const info = await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noWarnings: true,
      quiet: true,
      ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    });
    return typeof info.duration === 'number' ? info.duration : null;
  } catch (_) {
    return null;
  }
}

/** Find the first audio file in a directory (by prefix/extension). */
async function findAudioFile(dir, prefix = '') {
  const files = await readdir(dir);
  const match = files
    .filter((f) => f.startsWith(prefix) && /\.(m4a|webm|opus|mp3|wav|mp4|mpeg|mpga|ogg|flac)$/i.test(f))
    .map((f) => path.join(dir, f))[0];
  return match || null;
}

/** Slice a local audio file into a 10-minute mp3 chunk using ffmpeg */
async function sliceAudioFile(inputPath, outputPath, startSec, durationSec) {
  await execFileAsync(ffmpegPath, [
    '-y',
    '-ss', String(startSec),
    '-t', String(durationSec),
    '-i', inputPath,
    '-vn',
    '-c:a', 'libmp3lame',
    '-b:a', '48k',
    outputPath,
  ]);
}

/** Download a time-bounded segment of a YouTube video's audio using yt-dlp. */
async function downloadAudioSegment(videoId, outputTemplate, startSec, endSec) {
  const section = endSec != null ? `*${startSec}-${endSec}` : `*${startSec}-inf`;
  await youtubeDl.exec(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      format: 'worstaudio/bestaudio[abr<=48]/bestaudio',
      output: outputTemplate,
      downloadSections: section,
      forceKeyframesAtCuts: true,
      noPlaylist: true,
      noWarnings: true,
      noProgress: true,
      quiet: true,
      ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    },
    { timeout: 360000 }
  );
}

/**
 * Transcribe a single audio file via Groq Whisper.
 * @param {OpenAI} groq – Groq client
 * @param {string} audioPath – path to audio file
 * @param {number} offsetSecs – add this to all returned timestamps
 */
async function transcribeSegment(client, audioPath, offsetSecs, model, providerName) {
  const transcription = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  if (!Array.isArray(transcription.segments) || transcription.segments.length === 0) {
    return [];
  }

  return transcription.segments
    .filter((seg) => typeof seg.text === 'string' && seg.text.trim() && Number.isFinite(seg.start))
    .map((seg) => ({
      text: seg.text.trim(),
      start: seg.start + offsetSecs,
      duration: Number.isFinite(seg.end) ? Math.max(0, seg.end - seg.start) : 0,
      provider: providerName,
    }));
}

export async function transcribeAudioWithAssemblyAI(
  audioPath,
  apiKey,
  offsetSecs = 0,
  {
    fetchImpl = fetch,
    sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    pollIntervalMs = 1000,
    maxPolls = 180,
  } = {}
) {
  const audio = await readFile(audioPath);
  const uploadResponse = await fetchImpl('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/octet-stream' },
    body: audio,
  });
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok || !upload.upload_url) {
    throw new Error(upload.error || `AssemblyAI audio upload failed with HTTP ${uploadResponse.status}`);
  }

  const submissionResponse = await fetchImpl('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: upload.upload_url, speaker_labels: false }),
  });
  let transcript = await submissionResponse.json();
  if (!submissionResponse.ok || !transcript.id) {
    throw new Error(transcript.error || `AssemblyAI submission failed with HTTP ${submissionResponse.status}`);
  }

  for (let attempt = 0; transcript.status === 'queued' || transcript.status === 'processing'; attempt++) {
    if (attempt >= maxPolls) throw new Error('AssemblyAI transcription polling timed out');
    await sleepFn(pollIntervalMs);
    const pollResponse = await fetchImpl(`https://api.assemblyai.com/v2/transcript/${encodeURIComponent(transcript.id)}`, {
      headers: { authorization: apiKey },
    });
    transcript = await pollResponse.json();
    if (!pollResponse.ok) {
      throw new Error(transcript.error || `AssemblyAI polling failed with HTTP ${pollResponse.status}`);
    }
  }

  if (transcript.status !== 'completed') {
    throw new Error(transcript.error || `AssemblyAI transcription ended with status "${transcript.status}"`);
  }
  const segments = Array.isArray(transcript.utterances) && transcript.utterances.length
    ? transcript.utterances
    : (Array.isArray(transcript.words) ? transcript.words : []);

  return segments
    .filter((segment) => typeof segment.text === 'string' && segment.text.trim() && Number.isFinite(segment.start))
    .map((segment) => ({
      text: segment.text.trim(),
      start: segment.start / 1000 + offsetSecs,
      duration: Number.isFinite(segment.end) ? Math.max(0, (segment.end - segment.start) / 1000) : 0,
      provider: 'AssemblyAI',
    }));
}

/**
 * Transcribes YouTube audio via Groq Whisper or OpenAI Whisper with chunking.
 */
export async function transcribeYouTubeAudio(videoId, { provider = 'groq', apiKey } = {}) {
  if (!apiKey) throw new Error(`${provider} transcription API key is not set`);
  if (!['assemblyai', 'groq', 'openai'].includes(provider)) {
    throw new Error(`Unsupported transcription provider: ${provider}`);
  }

  const providerName = provider === 'assemblyai'
    ? 'AssemblyAI'
    : provider === 'groq'
      ? 'Groq Whisper'
      : 'OpenAI Whisper';
  const model = provider === 'groq'
    ? process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo'
    : process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
  const transcriptionClient = provider === 'assemblyai' ? null : new OpenAI({
    apiKey,
    ...(provider === 'groq' ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
    timeout: 120_000,
  });
  const transcribe = (audioPath, offsetSecs) => provider === 'assemblyai'
    ? transcribeAudioWithAssemblyAI(audioPath, apiKey, offsetSecs)
    : transcribeSegment(transcriptionClient, audioPath, offsetSecs, model, providerName);

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lectureloop-audio-'));

  try {
    // ── Step 1: Try downloading full audio at lowest acceptable bitrate ──
    const fullOutputTemplate = path.join(tempDir, 'audio-full.%(ext)s');
    let fullAudioPath = null;

    try {
      console.log(`[Transcript] Downloading audio for YouTube video ${videoId}...`);
      await youtubeDl.exec(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          format: 'worstaudio/bestaudio[abr<=48]/bestaudio',
          output: fullOutputTemplate,
          noPlaylist: true,
          noWarnings: true,
          noProgress: true,
          quiet: true,
          ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
        },
        { timeout: 600000 }
      );
      fullAudioPath = await findAudioFile(tempDir, 'audio-full');
    } catch (dlErr) {
      console.warn(`[Transcript] Full audio download failed (${dlErr.message}); will try direct chunk downloads.`);
    }

    // ── Step 2: If full audio is small enough (<= 23MB), transcribe directly ──
    if (fullAudioPath) {
      const audioStat = await stat(fullAudioPath);
      if (audioStat.size <= GROQ_MAX_AUDIO_BYTES) {
        console.log(`[Transcript] Audio file (${Math.round(audioStat.size / 1e6)} MB) is within limit — transcribing with ${providerName}.`);
        const segments = await transcribe(fullAudioPath, 0);
        if (segments.length === 0) throw new Error(`${providerName} returned no usable transcript segments`);
        const fullText = segments.map((s) => `[${formatTimestamp(s.start)}] ${s.text}`).join(' ');
        const source = provider === 'assemblyai' ? provider : `${provider}-whisper`;
        return { rawSegments: segments, fullText, videoId, source };
      }
      console.log(`[Transcript] Audio (${Math.round(audioStat.size / 1e6)} MB > 23 MB) — splitting locally with ffmpeg.`);
    }

    // ── Step 3: Chunked transcription ──
    const duration = await getVideoDuration(videoId);
    if (!duration) {
      throw new Error(
        `Could not determine video duration. YouTube captions are unavailable and the audio exceeds the ${providerName} upload limit.`
      );
    }

    console.log(`[Transcript] Video duration is ${Math.round(duration / 60)} minutes — processing in ${CHUNK_DURATION_SECS / 60}-minute chunks.`);

    const allSegments = [];
    let chunkStart = 0;
    let chunkIndex = 0;

    while (chunkStart < duration) {
      const chunkEnd = Math.min(chunkStart + CHUNK_DURATION_SECS, duration);
      const chunkDuration = chunkEnd - chunkStart;
      const chunkLabel = `chunk-${chunkIndex}`;
      const chunkMp3Path = path.join(tempDir, `${chunkLabel}.mp3`);

      console.log(
        `[Transcript] Processing Chunk ${chunkIndex + 1}: ${formatTimestamp(chunkStart)} – ${formatTimestamp(chunkEnd)}`
      );

      let chunkReady = false;

      // Slicing from full audio locally via ffmpeg is super fast (~1 sec)
      if (fullAudioPath && ffmpegPath) {
        try {
          await sliceAudioFile(fullAudioPath, chunkMp3Path, chunkStart, chunkDuration);
          chunkReady = true;
        } catch (sliceErr) {
          console.warn(`[Transcript] ffmpeg local slice failed (${sliceErr.message}); falling back to yt-dlp section download.`);
        }
      }

      // If local slice not available, download section via yt-dlp
      if (!chunkReady) {
        const isLastChunk = chunkEnd >= duration;
        const chunkOutputTemplate = path.join(tempDir, `${chunkLabel}.%(ext)s`);
        await downloadAudioSegment(
          videoId,
          chunkOutputTemplate,
          chunkStart,
          isLastChunk ? null : chunkEnd
        );
      }

      const activeChunkPath = chunkReady ? chunkMp3Path : await findAudioFile(tempDir, chunkLabel);
      if (!activeChunkPath) {
        throw new Error(`Audio chunk ${chunkIndex + 1} produced no output file`);
      }

      const chunkStat = await stat(activeChunkPath);
      if (chunkStat.size > GROQ_MAX_AUDIO_BYTES) {
        throw new Error(
          `Chunk ${chunkIndex + 1} (${Math.round(chunkStat.size / 1e6)} MB) still exceeds the ${providerName} 25 MB limit.`
        );
      }

      console.log(`[Transcript] Transcribing chunk ${chunkIndex + 1} (${(chunkStat.size / 1e6).toFixed(1)} MB) via ${providerName}...`);
      const segments = await transcribe(activeChunkPath, chunkStart);
      allSegments.push(...segments);

      // Clean up chunk file to save disk space
      try { await rm(activeChunkPath, { force: true }); } catch (_) {}

      chunkStart = chunkEnd;
      chunkIndex++;
    }

    if (allSegments.length === 0) {
      throw new Error(`${providerName} returned no usable transcript segments from any chunk`);
    }

    const fullText = allSegments.map((s) => `[${formatTimestamp(s.start)}] ${s.text}`).join(' ');
    console.log(`[Transcript] Chunked transcription complete — ${allSegments.length} segments from ${chunkIndex} chunks.`);
    const source = provider === 'assemblyai' ? provider : `${provider}-whisper-chunked`;
    return { rawSegments: allSegments, fullText, videoId, source };

  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
