import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getRevenueAnalytics,
  getUserGrowthAnalytics,
  getBookingTrends,
  getFundiPerformanceAnalytics,
  getComprehensiveDashboard
} from '../controllers/advancedAnalyticsController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'super_admin'));

router.get('/revenue', getRevenueAnalytics);
router.get('/user-growth', getUserGrowthAnalytics);
router.get('/booking-trends', getBookingTrends);
router.get('/fundi-performance', getFundiPerformanceAnalytics);
router.get('/dashboard', getComprehensiveDashboard);

export default router;
