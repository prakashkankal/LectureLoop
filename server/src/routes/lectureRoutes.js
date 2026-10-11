import express from 'express';
import { createLecture, getLectures } from '../controllers/lectureController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getLectures);
router.post('/', protect, createLecture);

export default router;
