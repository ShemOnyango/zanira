// routes/matching.js
import express from 'express';
import {
  findMatchingFundis,
  emergencyMatch,
  updateMatchingPreferences,
  getMatchingStats,
  adminForceMatch,
  getLocalityFallback
} from '../controllers/matchingController.js';
import { protect, authorize } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const matchingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many matching requests, please try again later.'
  }
});

const emergencyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 emergency requests per windowMs
  message: {
    error: 'Too many emergency requests, please try again later or contact support.'
  }
});

// All routes are protected
router.use(protect);

router.post('/find-fundis', matchingLimiter, authorize('client', 'admin'), findMatchingFundis);
router.post('/emergency-match', emergencyLimiter, authorize('client', 'admin'), emergencyMatch);
router.post('/locality-fallback', authorize('client', 'admin'), getLocalityFallback);
router.patch('/preferences', authorize('fundi'), updateMatchingPreferences);
router.get('/stats', authorize('fundi'), getMatchingStats);
router.post('/admin/force-match', authorize('admin', 'super_admin'), adminForceMatch);

export default router;