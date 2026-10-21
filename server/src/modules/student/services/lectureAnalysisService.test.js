import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeLectureAudio, validateGeneratedAnalysis } from './lectureAnalysisService.js';

const makeAnalysis = () => ({
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

test('transcribes audio with Whisper and returns the generated study materials', async () => {
  const calls = { transcription: null, generation: null };
  const client = {
    audio: {
      transcriptions: {
        create: async (request) => {
          calls.transcription = request;
          return { text: 'A lecture transcript.' };
        },
      },
    },
    chat: {
      completions: {
        create: async (request) => {
          calls.generation = request;
          return { choices: [{ message: { content: JSON.stringify(makeAnalysis()) } }] };
        },
      },
    },
  };

  const result = await analyzeLectureAudio({
    buffer: Buffer.from('audio'),
    mimetype: 'audio/mpeg',
    originalname: 'lecture.mp3',
  }, client);

  assert.equal(calls.transcription.model, 'whisper-1');
  assert.equal(calls.generation.response_format.type, 'json_object');
  assert.equal(result.transcript, 'A lecture transcript.');
  assert.equal(result.questions.length, 5);
});

test('reports when no speech was transcribed', async () => {
  const client = {
    audio: { transcriptions: { create: async () => ({ text: ' ' }) } },
    chat: { completions: { create: async () => assert.fail('Generation should not run') } },
  };

  await assert.rejects(
    analyzeLectureAudio({
      buffer: Buffer.from('audio'),
      mimetype: 'audio/mpeg',
      originalname: 'lecture.mp3',
    }, client),
    { statusCode: 422, message: 'No speech was detected in this audio file.' },
  );
});
