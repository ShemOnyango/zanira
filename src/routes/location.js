import express from 'express';
import {
  startLocationTracking,
  updateLocation,
  getTrackingSession,
  stopLocationTracking,
  getLocationHistory,
  updateTrackingSettings
} from '../controllers/locationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Fundi routes
router.post('/start-tracking', authorize('fundi'), startLocationTracking);
router.post('/update', authorize('fundi'), updateLocation);
router.post('/stop-tracking', authorize('fundi'), stopLocationTracking);
router.patch('/settings/:sessionId', authorize('fundi'), updateTrackingSettings);

// Client and Fundi routes
router.get('/session/:bookingId', validateObjectId, getTrackingSession);
router.get('/history/:sessionId', getLocationHistory);

export default router;