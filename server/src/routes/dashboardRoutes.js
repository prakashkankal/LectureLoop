import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/stats - Returns dashboard KPI metrics
router.get('/stats', protectStudent, getDashboardStats);

export default router;
