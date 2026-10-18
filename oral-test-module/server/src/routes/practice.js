import { randomUUID } from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { execute, queryAll, queryOne } from '../db/sqlite.js';
import { requireAuth } from '../middleware/auth.js';
import { sampleMaterials } from '../data/samples.js';
import { evaluateAnswer, generateQuestions } from '../services/assessment.js';

const router = express.Router();
router.use(requireAuth);

const materialSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  lecture: z.string().trim().min(1).max(160),
  topic: z.string().trim().min(1).max(160),
  notes: z.string().trim().min(20).max(30000),
  keyTerms: z.array(z.string().trim().min(1).max(80)).max(80).default([]),
});
const difficultySchema = z.enum(['basic', 'intermediate', 'advanced']);

router.get('/materials', (_request, response) => response.json({ materials: sampleMaterials }));

router.post('/questions', async (request, response, next) => {
  try {
    const parsedMaterial = materialSchema.safeParse(request.body.material);
    const difficulty = difficultySchema.catch('intermediate').parse(request.body.difficulty);
    const count = Number(request.body.count || 5);
    if (!parsedMaterial.success || !Number.isInteger(count) || count < 1 || count > 8) {
      return response.status(400).json({ error: 'Provide valid notes and request 1 to 8 questions.' });
    }
    const result = await generateQuestions(parsedMaterial.data, difficulty, count);
    return response.json({ ...result, material: parsedMaterial.data });
  } catch (error) {
    return next(error);
  }
});

router.post('/evaluate', async (request, response, next) => {
  try {
    const parsedMaterial = materialSchema.safeParse(request.body.material);
    const answer = z.string().trim().min(1).max(12000).safeParse(request.body.answer);
    const question = z.object({
      id: z.string().max(100).optional(),
      question: z.string().trim().min(1).max(1000),
      focus: z.string().max(5000).default(''),
      modelAnswer: z.string().max(5000).default(''),
      keyTerms: z.array(z.string().max(80)).max(40).default([]),
    }).safeParse(request.body.question);
    const originalTranscript = z.string().max(12000).catch('').parse(request.body.originalTranscript || '');
    const mode = z.enum(['english-assessment', 'practice']).catch('english-assessment').parse(request.body.mode);
    const durationSeconds = z.number().min(0).max(3600).catch(0).parse(Number(request.body.durationSeconds || 0));
    const difficulty = difficultySchema.catch('intermediate').parse(request.body.difficulty);
    if (!parsedMaterial.success || !answer.success || !question.success) {
      return response.status(400).json({ error: 'Provide valid source notes, question, and a non-empty answer.' });
    }
    const evaluation = await evaluateAnswer({
      answer: answer.data,
      question: question.data,
      material: parsedMaterial.data,
      durationSeconds,
      mode,
    });
    const attempt = {
      id: randomUUID(),
      userId: request.user.id,
      topic: parsedMaterial.data.topic,
      difficulty,
      mode,
      question: question.data.question,
      questionData: question.data,
      material: parsedMaterial.data,
      originalTranscript: originalTranscript || answer.data,
      answer: answer.data,
      evaluation,
      durationSeconds,
      createdAt: new Date().toISOString(),
    };
    execute(
      'INSERT INTO attempts (id, user_id, topic, difficulty, mode, question, question_json, material_json, original_transcript, submitted_answer, evaluation_json, pace_wpm, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [attempt.id, attempt.userId, attempt.topic, attempt.difficulty, attempt.mode, attempt.question, JSON.stringify(question.data), JSON.stringify(parsedMaterial.data), attempt.originalTranscript, attempt.answer, JSON.stringify(evaluation), evaluation.paceWpm, durationSeconds, attempt.createdAt],
    );
    return response.json({ attempt });
  } catch (error) {
    return next(error);
  }
});

router.get('/attempts', (request, response) => {
  const rows = queryAll(
    'SELECT id, topic, difficulty, mode, question, question_json, material_json, original_transcript, submitted_answer, evaluation_json, pace_wpm, duration_seconds, created_at FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [request.user.id],
  );
  const attempts = rows.map((row) => ({
    id: row.id,
    topic: row.topic,
    difficulty: row.difficulty,
    mode: row.mode,
    question: row.question,
    questionData: JSON.parse(row.question_json),
    material: JSON.parse(row.material_json),
    originalTranscript: row.original_transcript,
    answer: row.submitted_answer,
    evaluation: JSON.parse(row.evaluation_json),
    paceWpm: row.pace_wpm,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  }));
  return response.json({ attempts });
});

router.delete('/attempts/:id', (request, response) => {
  const owned = queryOne('SELECT id FROM attempts WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]);
  if (!owned) return response.status(404).json({ error: 'Attempt not found.' });
  execute('DELETE FROM attempts WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]);
  return response.status(204).end();
});

export default router;