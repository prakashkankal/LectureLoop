import express from 'express';
import {
  createLecture,
  getLectures,
  analyzeLecture,
  getLectureStatus,
  getLectureById,
  completeLectureTopic,
  flagLectureTopicForReview,
  deleteLecture,
  getLectureSession,
  saveLectureSession,
  saveLectureNote,
  createLectureBookmark,
  submitLectureQuizAttempt,
  searchLearningMaterials,
} from '../controllers/lectureController.js';
import {
  getLectureNotes,
  generateTopicNote,
  generateAllTopicNotes,
  getNotesGenerationStatus,
  regenerateTopicNote,
  downloadTopicNote,
  downloadAllNotesZip,
  getTopicNoteImage,
} from '../controllers/topicNotesController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// AI analysis pipeline (async — returns 202 + lectureId for polling)
router.post('/analyze', protectStudent, analyzeLecture);
router.get('/search', protectStudent, searchLearningMaterials);

// ─── Topic-Wise Handwritten Infographic Notes Endpoints ──────────────────────
// Bulk operations & Status (before generic :id patterns)
router.get('/:lectureId/notes/download-all', protectStudent, downloadAllNotesZip);
router.get('/:lectureId/notes/generation-status', protectStudent, getNotesGenerationStatus);
router.post('/:lectureId/notes/generate-all', protectStudent, generateAllTopicNotes);
router.get('/:lectureId/notes', protectStudent, getLectureNotes);

// Single Topic Note operations
router.post('/:lectureId/topics/:topicId/notes/generate', protectStudent, generateTopicNote);
router.post('/:lectureId/topics/:topicId/notes/regenerate', protectStudent, regenerateTopicNote);
router.get('/:lectureId/topics/:topicId/notes/download', protectStudent, downloadTopicNote);
router.get('/:lectureId/topics/:topicId/notes/image', protectStudent, getTopicNoteImage);

// Polling endpoint — called every 2s by frontend until status === 'complete'
router.get('/:id/status', protectStudent, getLectureStatus);

// Interactive learning progress and lecture management
router.patch('/:id/topics/:topicIndex/complete', protectStudent, completeLectureTopic);
router.patch('/:id/topics/:topicIndex/review', protectStudent, flagLectureTopicForReview);
router.get('/:id/session', protectStudent, getLectureSession);
router.patch('/:id/session', protectStudent, saveLectureSession);
router.put('/:id/notes', protectStudent, saveLectureNote);
router.post('/:id/bookmarks', protectStudent, createLectureBookmark);
router.post('/:id/quiz-attempts', protectStudent, submitLectureQuizAttempt);
router.delete('/:id', protectStudent, deleteLecture);

// Fetch single lecture by ID (used by LearningSessionPage)
router.get('/:id', protectStudent, getLectureById);

// Basic CRUD
router.get('/', protectStudent, getLectures);
router.post('/', protectStudent, createLecture);

export default router;
