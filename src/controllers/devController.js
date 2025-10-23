import Notification from '../models/Notification.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import logger from '../middleware/logger.js';

// POST /api/v1/dev/send-notification
// Body: { title, message, recipientType?, recipientIds? }
export const devSendNotification = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Dev endpoint disabled' });
  }

  const devKey = process.env.DEV_KEY;
  if (devKey) {
    const provided = req.header('x-dev-key');
    if (!provided || provided !== devKey) {
      return res.status(403).json({ success: false, error: 'Invalid DEV_KEY header' });
    }
  }

  const { title, message, recipientType, recipientIds } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'title and message required' });
  }

  let recipients = [];
  if (recipientIds && Array.isArray(recipientIds)) recipients = recipientIds;
  else if (recipientIds && typeof recipientIds === 'string') recipients = recipientIds.split(',').map(s => s.trim());
  else if (recipientType) {
    const query = {};
    if (recipientType !== 'all') query.role = recipientType;
    const users = await User.find(query).select('_id');
    recipients = users.map(u => String(u._id));
  } else {
    return res.status(400).json({ success: false, error: 'recipientType or recipientIds required' });
  }

  const results = { success: [], failed: [] };
  const io = req.app.get('socketService');

  for (const recipient of recipients) {
    try {
      const notification = await Notification.create({
        recipient,
        recipientType: recipientType || 'all',
        title,
        message,
        notificationType: 'dev_test',
        action: 'none',
        priority: 'normal'
      });

      // Emit via socketService if available
      try {
        if (io && io.io) io.io.to(String(recipient)).emit('notification:new', notification);
      } catch (emitErr) {
        logger.warn('Dev emit failed', emitErr.message);
      }

      results.success.push({ recipient, notificationId: notification._id });
    } catch (err) {
      results.failed.push({ recipient, reason: err.message });
    }
  }

  // Emit summary to caller if app socket available (caller must be connected client in real flow)
  try {
    if (io && io.io && req.user && req.user._id) {
      io.io.to(String(req.user._id)).emit('bulk:notification:sent', {
        total: recipients.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      });
    }
  } catch (e) {
    // ignore
  }

  res.status(200).json({ success: true, data: results });
});

export default {
  devSendNotification
};
