// routes/matching.js
import express from 'express';
import {
  findMatchingFundis,
  emergencyMatch,
  updateMatchingPreferences,
  getMatchingStats,
  adminForceMatch
} from '../controllers/matchingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/find-fundis', authorize('client', 'admin'), findMatchingFundis);
router.post('/emergency-match', authorize('client', 'admin'), emergencyMatch);
router.patch('/preferences', authorize('fundi'), updateMatchingPreferences);
router.get('/stats', authorize('fundi'), getMatchingStats);
router.post('/admin/force-match', authorize('admin', 'super_admin'), adminForceMatch);

export default router;