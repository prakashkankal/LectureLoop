import { YoutubeTranscript } from 'youtube-transcript';
import { transcribeYouTubeAudio } from './groqTranscriptService.js';

function formatTimestamp(seconds) {
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function createTranscriptResult(rawSegments, videoId, source) {
  if (!rawSegments.length) throw new Error(`${source} returned no timestamped transcript segments`);
  const fullText = rawSegments
    .map((segment) => `[${formatTimestamp(segment.start)}] ${segment.text}`)
    .join(' ');
  return { rawSegments, fullText, videoId, source };
}

export function getTranscriptProviderKeys(...configuredKeys) {
  return [...new Set(configuredKeys
    .flatMap((keys) => (keys || '').split(','))
    .map((key) => key.trim())
    .filter(Boolean))];
}

/**
 * Extract YouTube video ID from a full URL or bare ID.
 * Handles: https://youtube.com/watch?v=XXX, https://youtu.be/XXX, bare IDs
 */
export function extractVideoId(urlOrId) {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = urlOrId.match(regex);
  if (match) return match[1];
  // If it's already a bare video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId.trim())) return urlOrId.trim();
  return null;
}

/**
 * Fetch the public YouTube oEmbed title without requiring an API key.
 */
export async function fetchYouTubeVideoTitle(youtubeUrl, fetchImpl = fetch) {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL — could not extract video ID.');
  }

  const oembedUrl = new URL('https://www.youtube.com/oembed');
  oembedUrl.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  oembedUrl.searchParams.set('format', 'json');

  const response = await fetchImpl(oembedUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    throw new Error(`YouTube title lookup failed with status ${response.status}.`);
  }

  const data = await response.json();
  if (typeof data.title !== 'string' || !data.title.trim()) {
    throw new Error('YouTube did not return a video title.');
  }
  return data.title.trim();
}

/**
 * Fetch and clean the transcript for a YouTube video.
 * Returns: { rawSegments, fullText, videoId }
 * rawSegments: [{ text, start, duration }]  (start/duration are in seconds)
 */
export async function fetchTranscript(youtubeUrl) {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL — could not extract video ID.');
  }

  const errors = [];
  const assemblyKeys = getTranscriptProviderKeys(
    process.env.ASSEMBLYAI_API_KEYS,
    process.env.ASSEMBLYAI_API_KEY
  );
  for (const apiKey of assemblyKeys) {
    try {
      return await transcribeYouTubeAudio(videoId, { provider: 'assemblyai', apiKey });
    } catch (err) {
      console.warn(`[Transcript] AssemblyAI failed (${err.message}); trying the next transcription provider.`);
      errors.push(`AssemblyAI: ${err.message}`);
    }
  }

  const groqKeys = getTranscriptProviderKeys(
    process.env.GROQ_API_KEYS,
    process.env.GROQ_API_KEY,
    process.env.WISPER_API_KEY
  );
  for (const apiKey of groqKeys) {
    try {
      return await transcribeYouTubeAudio(videoId, { provider: 'groq', apiKey });
    } catch (err) {
      console.warn(`[Transcript] Groq Whisper failed (${err.message}); trying the next transcription provider.`);
      errors.push(`Groq Whisper: ${err.message}`);
    }
  }

  const openAIKeys = getTranscriptProviderKeys(
    process.env.OPENAI_API_KEYS,
    process.env.OPENAI_API_KEY,
    process.env.OPEN_AI_API,
    process.env['OPEN-AI-API']
  );
  for (const apiKey of openAIKeys) {
    try {
      return await transcribeYouTubeAudio(videoId, { provider: 'openai', apiKey });
    } catch (err) {
      console.warn(`[Transcript] OpenAI Whisper failed (${err.message}); trying the next transcription provider.`);
      errors.push(`OpenAI Whisper: ${err.message}`);
    }
  }

  try {
    const rawSegments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!rawSegments?.length) throw new Error('No transcript found. The video may have no captions enabled.');
    return createTranscriptResult(
      rawSegments
        .filter((segment) => typeof segment.text === 'string' && segment.text.trim() && Number.isFinite(segment.start))
        .map((segment) => ({
          text: segment.text.trim(),
          start: segment.start,
          duration: Number.isFinite(segment.duration) ? segment.duration : 0,
        })),
      videoId,
      'youtube-captions'
    );
  } catch (err) {
    errors.push(`YouTube captions: ${err.message}`);
  }

  throw new Error(`All transcript providers failed: ${errors.join('; ') || 'No transcription API keys are configured'}`);
}
