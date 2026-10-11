import express from 'express';
import { getSubjects, createSubject } from '../controllers/subjectController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSubjects);
router.post('/', protect, createSubject);

export default router;
