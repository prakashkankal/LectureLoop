import express from 'express';
import { createLecture, getLectures } from '../controllers/lectureController.js';
import { analyzeAudio } from '../controllers/lectureAnalysisController.js';
import { protect } from '../middleware/authMiddleware.js';
import { handleAudioUpload } from '../middleware/audioUploadMiddleware.js';

const router = express.Router();

router.get('/', protect, getLectures);
router.post('/analyze-audio', protect, handleAudioUpload, analyzeAudio);
router.post('/', protect, createLecture);

export default router;
