import express from 'express';
import {
  getPlatformAnalytics,
  getFundiAnalytics,
  getClientAnalytics,
  getRealtimeAnalytics,
  exportAnalytics
} from '../controllers/analyticsController.js';
import { getComprehensiveDashboard } from '../controllers/advancedAnalyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Client analytics
router.get('/client', authorize('client'), getClientAnalytics);

// Fundi analytics
router.get('/fundi', authorize('fundi'), getFundiAnalytics);

// Admin analytics
router.get('/platform', authorize('admin', 'super_admin'), getPlatformAnalytics);
router.get('/realtime', authorize('admin', 'super_admin'), getRealtimeAnalytics);
router.post('/export', authorize('admin', 'super_admin'), exportAnalytics);

// Expose the advanced admin dashboard under /analytics/admin/dashboard so frontend can call it
router.get('/admin/dashboard', authorize('admin', 'super_admin'), getComprehensiveDashboard);

export default router;