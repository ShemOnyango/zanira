// routes/notifications.js
import express from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  // new
  updatePreferences,
  getNotificationStats,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getUserNotifications);
router.get('/stats', getNotificationStats);
router.patch('/preferences', updatePreferences);
router.patch('/:id/read', validateObjectId, markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', validateObjectId, deleteNotification);

export default router;