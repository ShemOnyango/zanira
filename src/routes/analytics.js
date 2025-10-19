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

// Aliases for frontend (some frontend code calls these exact paths)
function mapTimeRangeToPeriod(timeRange) {
  if (!timeRange) return undefined;
  const r = String(timeRange).toLowerCase();
  if (r.includes('7')) return '7d';
  if (r.includes('30')) return '30d';
  if (r.includes('90')) return '90d';
  if (r.includes('ytd')) return 'ytd';
  return undefined;
}

// Frontend expects /analytics/platform-metrics
router.get('/platform-metrics', authorize('admin', 'super_admin'), (req, res, next) => {
  // support frontend timeRange param like ?timeRange=30days
  const mapped = mapTimeRangeToPeriod(req.query.timeRange);
  if (mapped) req.query.period = mapped;
  return getPlatformAnalytics(req, res, next);
});

// Frontend expects /analytics/advanced/dashboard
router.get('/advanced/dashboard', authorize('admin', 'super_admin'), (req, res, next) => {
  const mapped = mapTimeRangeToPeriod(req.query.timeRange);
  if (mapped) req.query.period = mapped;
  return getComprehensiveDashboard(req, res, next);
});

export default router;