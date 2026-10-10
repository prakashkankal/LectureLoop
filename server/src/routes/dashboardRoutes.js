import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/stats - Returns dashboard KPI metrics
router.get('/stats', protect, getDashboardStats);

export default router;
