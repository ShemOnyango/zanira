import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import logger from '../middleware/logger.js';
import { resolveRecipientType, normalizeRole } from '../utils/roleUtils.js';

const router = express.Router();

// Dev-only endpoint to simulate sending notifications
// Accepts: { title, message, recipientType, recipientIds }
router.post('/send-test-notification', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_KEY !== req.headers['x-dev-key']) {
    return res.status(403).json({ success: false, error: 'Not allowed in production' });
  }

  const { title = 'Test Notification', message = 'This is a test', recipientType, recipientIds } = req.body;

  let recipients = [];
  if (recipientIds && Array.isArray(recipientIds)) {
    recipients = recipientIds;
  } else if (recipientIds && typeof recipientIds === 'string') {
    recipients = recipientIds.split(',').map(s => s.trim()).filter(Boolean);
  } else if (recipientType) {
    const query = {};
    if (recipientType !== 'all') query.role = recipientType;
    const users = await User.find(query).select('_id');
    recipients = users.map(u => u._id.toString());
  } else {
    // default: send to the first active user (to avoid spamming)
    const u = await User.findOne({ isActive: true }).select('_id');
    if (u) recipients = [u._id.toString()];
  }

  const results = { success: [], failed: [] };

  for (const recipientId of recipients) {
    try {
      // Determine recipientType from requested value or user's role (normalized)
      let rType = resolveRecipientType(recipientType);
      if (!rType) {
        const user = await User.findById(recipientId).select('role');
        rType = normalizeRole(user?.role);
      }

      const notification = await Notification.create({
        recipient: recipientId,
        recipientType: rType,
        title,
        message,
        // use a valid notificationType enum
        notificationType: 'system_alert',
        // use a valid action enum or omit (default is 'dismiss')
        action: 'dismiss'
      });

      // Emit via socketService if available
      try {
        const socketService = req.app.get('socketService');
        if (socketService && socketService.io) {
          socketService.io.to(String(recipientId)).emit('notification:new', notification);
        }
      } catch (emitErr) {
        logger.warn('Dev emit failed', emitErr.message);
      }

      results.success.push({ recipientId, notificationId: notification._id });
    } catch (err) {
      results.failed.push({ recipientId, reason: err.message });
    }
  }

  // Also emit summary back to caller if socket for caller is available
  try {
    const socketService = req.app.get('socketService');
    if (socketService && socketService.io && req.headers['x-admin-id']) {
      socketService.io.to(String(req.headers['x-admin-id'])).emit('bulk:notification:sent', {
        total: recipients.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      });
    }
  } catch (e) {
    logger.warn('Dev admin summary emit failed', e.message);
  }

  res.status(200).json({ success: true, data: results });
}));

export default router;
