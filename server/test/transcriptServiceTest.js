import assert from 'assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fetchYouTubeVideoTitle, getTranscriptProviderKeys } from '../src/services/transcriptService.js';
import { transcribeAudioWithAssemblyAI } from '../src/services/groqTranscriptService.js';

async function runTests() {
  console.log('--- [Test Suite: YouTube Video Metadata] ---');

  let requestedUrl;
  const title = await fetchYouTubeVideoTitle('https://youtu.be/abcdefghijk', async (url, options) => {
    requestedUrl = new URL(url);
    assert(options.signal, 'YouTube metadata request should have a timeout signal');
    return {
      ok: true,
      json: async () => ({ title: '  Example YouTube Lecture  ' }),
    };
  });

  assert.strictEqual(title, 'Example YouTube Lecture');
  assert.strictEqual(requestedUrl.origin + requestedUrl.pathname, 'https://www.youtube.com/oembed');
  assert.strictEqual(
    requestedUrl.searchParams.get('url'),
    'https://www.youtube.com/watch?v=abcdefghijk',
    'Metadata lookup should use the validated canonical video URL'
  );
  assert.deepStrictEqual(
    getTranscriptProviderKeys('first-key, second-key', 'second-key'),
    ['first-key', 'second-key']
  );

  await assert.rejects(
    fetchYouTubeVideoTitle('not a YouTube URL', async () => {
      throw new Error('Fetch should not run for invalid URLs');
    }),
    /Invalid YouTube URL/
  );

  await assert.rejects(
    fetchYouTubeVideoTitle('abcdefghijk', async () => ({ ok: false, status: 404 })),
    /status 404/
  );

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lectureloop-assembly-test-'));
  try {
    const audioPath = path.join(tempDir, 'sample.mp3');
    await writeFile(audioPath, Buffer.from('fake audio bytes'));
    const requests = [];
    const fetchMock = async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith('/v2/upload')) {
        return { ok: true, json: async () => ({ upload_url: 'https://cdn.assemblyai.com/uploaded/audio' }) };
      }
      if (url.endsWith('/v2/transcript')) {
        return { ok: true, json: async () => ({ id: 'transcript-1', status: 'processing' }) };
      }
      return {
        ok: true,
        json: async () => ({
          id: 'transcript-1',
          status: 'completed',
          utterances: [{ text: 'A timestamped test transcript.', start: 1250, end: 3200 }],
        }),
      };
    };
    const segments = await transcribeAudioWithAssemblyAI(audioPath, 'test-key', 60, {
      fetchImpl: fetchMock,
      sleepFn: async () => {},
      pollIntervalMs: 0,
      maxPolls: 3,
    });
    assert.strictEqual(requests.length, 3, 'AssemblyAI upload, submit, and poll should be performed');
    assert.strictEqual(requests[0].url, 'https://api.assemblyai.com/v2/upload');
    assert(Buffer.isBuffer(requests[0].options.body), 'AssemblyAI upload should send binary audio bytes');
    assert.strictEqual(requests[1].url, 'https://api.assemblyai.com/v2/transcript');
    assert.strictEqual(segments[0].text, 'A timestamped test transcript.');
    assert.strictEqual(segments[0].start, 61.25, 'Chunk timestamp offset should be applied');
    assert.strictEqual(segments[0].duration, 1.95);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  console.log('✓ YouTube metadata, transcription provider keys, and AssemblyAI upload flow passed');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
