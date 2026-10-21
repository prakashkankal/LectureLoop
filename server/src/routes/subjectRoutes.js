import express from 'express';
import { getSubjects, getSubject, createSubject, updateSubject, deleteSubject } from '../controllers/subjectController.js';
import { protectStudent } from '../modules/student/middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protectStudent, getSubjects);
router.post('/', protectStudent, createSubject);
router.get('/:id', protectStudent, getSubject);
router.patch('/:id', protectStudent, updateSubject);
router.delete('/:id', protectStudent, deleteSubject);

export default router;
