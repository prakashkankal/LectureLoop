import mongoose from 'mongoose';
import Lecture from '../modules/student/models/Lecture.js';
import OralPracticeAttempt from '../models/OralPracticeAttempt.js';
import {
  assistLanguage,
  evaluateAnswer,
  generateQuestions,
  transcribeAudio,
} from '../services/oralPracticeService.js';

const difficulties = new Set(['basic', 'intermediate', 'advanced']);
const modes = new Set(['english-assessment', 'practice']);
const userIdOf = (request) => String(request.user?._id || request.user?.id || '');
const isDatabaseReady = () => mongoose.connection.readyState === 1;

function parseMaterial(value) {
  if (!value || typeof value !== 'object') return null;
  const fields = ['subject', 'lecture', 'topic', 'notes'];
  if (fields.some((field) => typeof value[field] !== 'string')) return null;
  const material = Object.fromEntries(fields.map((field) => [field, value[field].trim()]));
  if (material.notes.length < 20 || material.notes.length > 30_000) return null;
  if (fields.slice(0, 3).some((field) => !material[field] || material[field].length > 160)) return null;
  material.keyTerms = Array.isArray(value.keyTerms)
    ? value.keyTerms.filter((term) => typeof term === 'string' && term.trim()).slice(0, 80)
    : [];
  return material;
}

export async function getMaterials(request, response) {
  if (!isDatabaseReady()) {
    return response.json({ success: true, data: [] });
  }
  try {
    const userId = userIdOf(request);
    const query = mongoose.isValidObjectId(userId) ? { userId } : { _id: null };
    const lectures = await Lecture.find(query).sort({ createdAt: -1 }).lean();
    const materials = lectures.flatMap((lecture) => {
      const topics = Array.isArray(lecture.topics) && lecture.topics.length
        ? lecture.topics
        : [{ index: 1, title: lecture.title }];
      return topics.map((topic) => {
        const notes = [
          `${lecture.title}.`,
          lecture.description,
          topic.summary,
          topic.keyTerms?.length ? `Key terms: ${topic.keyTerms.join(', ')}.` : '',
        ].filter(Boolean).join('\n');
        return {
          id: `${lecture._id}:${topic.index || 1}`,
          subject: lecture.subject,
          lecture: lecture.title,
          topic: topic.title || lecture.title,
          notes: notes.length >= 20 ? notes : '',
          keyTerms: Array.isArray(topic.keyTerms) ? topic.keyTerms : [],
        };
      });
    });
    return response.json({ success: true, data: materials });
  } catch (error) {
    console.error('[Oral Practice] Could not load lecture materials:', error.message);
    return response.status(500).json({ success: false, error: 'Could not load lecture materials.' });
  }
}

export async function createQuestions(request, response) {
  const material = parseMaterial(request.body.material);
  const difficulty = difficulties.has(request.body.difficulty) ? request.body.difficulty : 'intermediate';
  const count = Number(request.body.count || 5);
  if (!material || !Number.isInteger(count) || count < 1 || count > 8) {
    return response.status(400).json({ success: false, error: 'Provide valid notes and request 1 to 8 questions.' });
  }
  try {
    const result = await generateQuestions(material, difficulty, count);
    return response.json({ success: true, data: { ...result, material, difficulty } });
  } catch (error) {
    console.error('[Oral Practice] Question generation failed:', error.message);
    return response.status(502).json({ success: false, error: error.message });
  }
}

export async function evaluateAndSave(request, response) {
  const material = parseMaterial(request.body.material);
  const question = request.body.question;
  const answer = typeof request.body.answer === 'string' ? request.body.answer.trim() : '';
  const difficulty = difficulties.has(request.body.difficulty) ? request.body.difficulty : 'intermediate';
  const mode = modes.has(request.body.mode) ? request.body.mode : 'english-assessment';
  const durationSeconds = Number(request.body.durationSeconds || 0);
  const originalTranscript = typeof request.body.originalTranscript === 'string'
    ? request.body.originalTranscript.slice(0, 12_000)
    : '';
  if (
    !material
    || !question || typeof question.question !== 'string' || !question.question.trim()
    || answer.length < 1 || answer.length > 12_000
    || !Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > 3600
  ) {
    return response.status(400).json({ success: false, error: 'Provide valid source notes, question, and a non-empty answer.' });
  }

  try {
    const evaluation = await evaluateAnswer({
      answer,
      question,
      material,
      durationSeconds,
      mode,
    });
    if (!isDatabaseReady()) {
      return response.status(503).json({ success: false, error: 'Practice history cannot be saved while the database is offline.' });
    }
    const attempt = await OralPracticeAttempt.create({
      userId: userIdOf(request),
      material,
      difficulty,
      mode,
      question: question.question.trim(),
      questionData: question,
      originalTranscript: originalTranscript || answer,
      answer,
      evaluation,
      durationSeconds,
    });
    return response.json({ success: true, data: { attempt } });
  } catch (error) {
    console.error('[Oral Practice] Answer evaluation failed:', error.message);
    return response.status(502).json({ success: false, error: error.message });
  }
}

export async function getAttempts(request, response) {
  if (!isDatabaseReady()) {
    return response.status(503).json({ success: false, error: 'Practice history is unavailable while the database is offline.' });
  }
  try {
    const attempts = await OralPracticeAttempt.find({ userId: userIdOf(request) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return response.json({ success: true, data: attempts });
  } catch (error) {
    console.error('[Oral Practice] Could not load practice history:', error.message);
    return response.status(500).json({ success: false, error: 'Could not load practice history.' });
  }
}

export async function deleteAttempt(request, response) {
  if (!isDatabaseReady()) {
    return response.status(503).json({ success: false, error: 'Practice history is unavailable while the database is offline.' });
  }
  try {
    const deleted = await OralPracticeAttempt.findOneAndDelete({
      _id: request.params.id,
      userId: userIdOf(request),
    });
    if (!deleted) return response.status(404).json({ success: false, error: 'Practice attempt not found.' });
    return response.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return response.status(404).json({ success: false, error: 'Practice attempt not found.' });
    console.error('[Oral Practice] Could not delete attempt:', error.message);
    return response.status(500).json({ success: false, error: 'Could not delete practice attempt.' });
  }
}

export async function languageAssist(request, response) {
  const text = typeof request.body.text === 'string' ? request.body.text.trim() : '';
  if (!text || text.length > 12_000) {
    return response.status(400).json({ success: false, error: 'Enter a response up to 12,000 characters.' });
  }
  try {
    return response.json({ success: true, data: await assistLanguage(text) });
  } catch (error) {
    console.error('[Oral Practice] Language assistance failed:', error.message);
    return response.status(502).json({ success: false, error: error.message });
  }
}

export async function transcribe(request, response) {
  if (!request.file?.buffer.length) {
    return response.status(400).json({ success: false, error: 'The recording is empty.' });
  }
  const language = ['en', 'hi'].includes(request.body.language) ? request.body.language : undefined;
  try {
    const transcript = await transcribeAudio(request.file.buffer, request.file.mimetype, language);
    return response.json({ success: true, data: { transcript, stored: false, provider: 'openai' } });
  } catch (error) {
    console.error('[Oral Practice] Audio transcription failed:', error.message);
    return response.status(502).json({ success: false, error: error.message });
  }
}
