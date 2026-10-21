import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeLectureAudio, validateGeneratedAnalysis } from './lectureAnalysisService.js';

const makeAnalysis = () => ({
  transcript: 'A lecture transcript.',
  summary: 'A concise lecture summary.',
  keyPoints: ['First key point.'],
  mindMap: {
    centralTopic: 'Core topic',
    branches: [{ title: 'Concepts', points: ['A related concept'] }],
  },
  questions: Array.from({ length: 5 }, (_, index) => ({
    question: `Question ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'].map((label) => ({ label, text: `Option ${label}` })),
    correctAnswer: 'A',
    explanation: 'The transcript supports this answer.',
  })),
});

test('validates exactly five complete multiple-choice questions', () => {
  const result = validateGeneratedAnalysis(makeAnalysis());
  assert.equal(result.questions.length, 5);
  assert.equal(result.questions[0].options.length, 4);
});

test('rejects generated results with an incorrect question count', () => {
  const analysis = makeAnalysis();
  analysis.questions.pop();
  assert.throws(() => validateGeneratedAnalysis(analysis), /incomplete lecture analysis/);
});

test('uploads audio to Gemini and returns transcript and study materials', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (String(url).includes('/upload/v1beta/files')) {
      return new Response(null, {
        status: 200,
        headers: { 'x-goog-upload-url': 'https://upload.example/audio' },
      });
    }

    if (url === 'https://upload.example/audio') {
      return Response.json({
        file: { uri: 'https://files.example/audio', name: 'files/audio', mimeType: 'audio/mpeg' },
      });
    }

    if (String(url).includes(':generateContent')) {
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(makeAnalysis()) }] } }],
      });
    }

    return new Response(null, { status: 200 });
  };

  const result = await analyzeLectureAudio({
    buffer: Buffer.from('audio'),
    size: 5,
    mimetype: 'audio/mpeg',
    originalname: 'lecture.mp3',
  }, fetchImpl);

  const generationCall = calls.find((call) => String(call.url).includes(':generateContent'));
  assert.equal(generationCall.options.method, 'POST');
  assert.equal(JSON.parse(generationCall.options.body).generationConfig.responseMimeType, 'application/json');
  assert.equal(result.transcript, 'A lecture transcript.');
  assert.equal(result.questions.length, 5);
  assert.ok(calls.some((call) => String(call.url).endsWith('/files/audio') && call.options.method === 'DELETE'));
});

test('reports when Gemini returns no transcribed speech', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('/upload/v1beta/files')) {
      return new Response(null, {
        status: 200,
        headers: { 'x-goog-upload-url': 'https://upload.example/audio' },
      });
    }
    if (url === 'https://upload.example/audio') {
      return Response.json({
        file: { uri: 'https://files.example/audio', name: 'files/audio', mimeType: 'audio/mpeg' },
      });
    }
    if (String(url).includes(':generateContent')) {
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ transcript: '' }) }] } }],
      });
    }
    return new Response(null, { status: 200 });
  };

  await assert.rejects(
    analyzeLectureAudio({
      buffer: Buffer.from('audio'),
      size: 5,
      mimetype: 'audio/mpeg',
      originalname: 'lecture.mp3',
    }, fetchImpl),
    { statusCode: 422, message: 'No speech was detected in this audio file.' },
  );
});
