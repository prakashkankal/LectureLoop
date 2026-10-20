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
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// AI analysis pipeline (async — returns 202 + lectureId for polling)
router.post('/analyze', protect, analyzeLecture);
router.get('/search', protect, searchLearningMaterials);

// ─── Topic-Wise Handwritten Infographic Notes Endpoints ──────────────────────
// Bulk operations & Status (before generic :id patterns)
router.get('/:lectureId/notes/download-all', protect, downloadAllNotesZip);
router.get('/:lectureId/notes/generation-status', protect, getNotesGenerationStatus);
router.post('/:lectureId/notes/generate-all', protect, generateAllTopicNotes);
router.get('/:lectureId/notes', protect, getLectureNotes);

// Single Topic Note operations
router.post('/:lectureId/topics/:topicId/notes/generate', protect, generateTopicNote);
router.post('/:lectureId/topics/:topicId/notes/regenerate', protect, regenerateTopicNote);
router.get('/:lectureId/topics/:topicId/notes/download', protect, downloadTopicNote);
router.get('/:lectureId/topics/:topicId/notes/image', getTopicNoteImage);

// Polling endpoint — called every 2s by frontend until status === 'complete'
router.get('/:id/status', protect, getLectureStatus);

// Interactive learning progress and lecture management
router.patch('/:id/topics/:topicIndex/complete', protect, completeLectureTopic);
router.patch('/:id/topics/:topicIndex/review', protect, flagLectureTopicForReview);
router.get('/:id/session', protect, getLectureSession);
router.patch('/:id/session', protect, saveLectureSession);
router.put('/:id/notes', protect, saveLectureNote);
router.post('/:id/bookmarks', protect, createLectureBookmark);
router.post('/:id/quiz-attempts', protect, submitLectureQuizAttempt);
router.delete('/:id', protect, deleteLecture);

// Fetch single lecture by ID (used by LearningSessionPage)
router.get('/:id', protect, getLectureById);

// Basic CRUD
router.get('/', protect, getLectures);
router.post('/', protect, createLecture);

export default router;
