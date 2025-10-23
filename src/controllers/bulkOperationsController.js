import User from '../models/User.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { sendEmail } from '../utils/emailUtils.js';
import logger from '../middleware/logger.js';

export const bulkUserAction = async (req, res, next) => {
  try {
    const { action, userIds: rawUserIds, reason } = req.body;
    // userIds may come as an array, a comma-separated string, or be omitted for cleanup
    let userIds = [];
    if (Array.isArray(rawUserIds)) userIds = rawUserIds;
    else if (typeof rawUserIds === 'string') {
      userIds = rawUserIds.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to perform bulk operations'
      });
    }

    // Allow certain actions to operate without explicit userIds
    if ((!userIds || userIds.length === 0) && action !== 'cleanup') {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    // If cleanup requested and no userIds provided, compute candidates (example: inactive > 1 year)
    if ((!userIds || userIds.length === 0) && action === 'cleanup') {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1); // users inactive for >1 year
      const candidates = await User.find({ isActive: false, createdAt: { $lt: cutoff } }).select('_id');
      userIds = candidates.map(u => String(u._id));
    }

    const results = {
      success: [],
      failed: []
    };

  for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          results.failed.push({ userId, reason: 'User not found' });
          continue;
        }

        switch (action) {
          case 'activate':
            user.isActive = true;
            await user.save();
            results.success.push(userId);
            break;

          case 'deactivate':
            user.isActive = false;
            await user.save();
            results.success.push(userId);
            break;

          case 'verify_email':
            user.isEmailVerified = true;
            await user.save();
            results.success.push(userId);
            break;

          case 'delete':
            await user.deleteOne();
            results.success.push(userId);
            break;

          default:
            results.failed.push({ userId, reason: 'Invalid action' });
        }

        await AuditLog.logAction({
          userId: req.user._id,
          userRole: req.user.role,
          userEmail: req.user.email,
          action: `bulk_${action}`,
          targetEntity: {
            entityType: 'User',
            entityId: userId,
            entityDescription: `User: ${user.email}`
          },
          metadata: { reason },
          severity: 'high',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (error) {
        results.failed.push({ userId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk operation completed',
      data: {
        total: userIds.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      }
    });

    logger.info(`Bulk ${action} completed: ${results.success.length}/${userIds.length} successful`);
  } catch (error) {
    next(error);
  }
};

export const bulkSendNotification = async (req, res, next) => {
  try {
    const { title, message, recipientType, recipientIds, notificationType, action, actionData } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send bulk notifications'
      });
    }

    let recipients = [];

    // Support recipientIds as array or comma-separated string
    if (recipientIds && Array.isArray(recipientIds)) {
      recipients = recipientIds;
    } else if (recipientIds && typeof recipientIds === 'string') {
      recipients = recipientIds.split(',').map(s => s.trim()).filter(Boolean);
    } else if (recipientType) {
      // Resolve the requested recipientType into canonical role or treat as 'all'
      const { resolveRecipientType } = await import('../utils/roleUtils.js');
      const resolved = resolveRecipientType(recipientType);

      let users = [];
      if (!resolved) {
        // 'all' or unknown -> select all users
        users = await User.find({}).select('_id');
      } else if (resolved === 'admin') {
        // Admin-like groups should include admin and super_admin
        users = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id');
      } else {
        users = await User.find({ role: resolved }).select('_id');
      }

      recipients = users.map(u => u._id);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either recipientIds or recipientType is required'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const recipientId of recipients) {
      try {
        // Normalize fields to match Notification model enums
        const recipientUser = await User.findById(recipientId).select('role');
        // Use roleUtils to resolve recipientType consistently
        const { resolveRecipientType, normalizeRole } = await import('../utils/roleUtils.js');
        const resolvedRecipientType = resolveRecipientType(recipientType) || normalizeRole(recipientUser?.role);

        // Map incoming notificationType to one of allowed enums (keep local mapping)
        const typeMap = (t) => {
          const allowedTypes = [
            'booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
            'payment_received', 'payment_failed', 'verification_approved', 'verification_rejected',
            'new_message', 'system_alert', 'promotional', 'security_alert'
          ];
          if (!t) return 'system_alert';
          if (allowedTypes.includes(t)) return t;
          if (t === 'system_announcement' || t === 'announcement') return 'system_alert';
          return 'system_alert';
        };

        const resolvedNotificationType = typeMap(notificationType);

        // Map action
        const actionMap = (a) => {
          const allowed = ['navigate', 'open_url', 'dismiss', 'reply'];
          if (!a) return 'dismiss';
          if (allowed.includes(a)) return a;
          if (a === 'none') return 'dismiss';
          return 'dismiss';
        };

        const resolvedAction = actionMap(action);

        // Ensure title exists
        const resolvedTitle = title && title.trim().length > 0 ? title : (message ? (message.length > 100 ? message.substring(0, 100) : message) : 'Notification');

        const notification = await Notification.create({
          recipient: recipientId,
          recipientType: resolvedRecipientType,
          title: resolvedTitle,
          message,
          notificationType: resolvedNotificationType,
          action: resolvedAction,
          actionData: actionData || {},
          priority: 'normal'
        });

        // Emit real-time event to recipient's personal room if socket service is available
        try {
          const socketService = req.app.get('socketService');
          if (socketService && socketService.io) {
            socketService.io.to(String(recipientId)).emit('notification:new', notification);
          }
        } catch (emitErr) {
          logger.warn('Failed to emit notification:new for recipient', recipientId, emitErr.message);
        }
        results.success.push(recipientId);
      } catch (error) {
        results.failed.push({ recipientId, reason: error.message });
      }
    }

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'bulk_notification',
      metadata: {
        title,
        message,
        recipientCount: recipients.length,
        successCount: results.success.length
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Bulk notification sent',
      data: {
        total: recipients.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      }
    });

    // Emit summary event to admin so frontend can show sent items/outbox immediately
    try {
      const socketService = req.app.get('socketService');
      if (socketService && socketService.io) {
        socketService.io.to(String(req.user._id)).emit('bulk:notification:sent', {
          total: recipients.length,
          successful: results.success.length,
          failed: results.failed.length,
          results
        });
      }
    } catch (emitErr) {
      logger.warn('Failed to emit bulk:notification:sent to admin', req.user._id, emitErr.message);
    }

    logger.info(`Bulk notification sent: ${results.success.length}/${recipients.length} successful`);
  } catch (error) {
    next(error);
  }
};

export const bulkSendEmail = async (req, res, next) => {
  try {
    const { subject, htmlContent, recipientType, recipientEmails } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send bulk emails'
      });
    }

    let emails = [];

    if (recipientEmails && Array.isArray(recipientEmails)) {
      emails = recipientEmails;
    } else if (recipientType) {
      const query = {};
      if (recipientType !== 'all') {
        query.role = recipientType;
      }
      const users = await User.find(query).select('email');
      emails = users.map(u => u.email);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either recipientEmails or recipientType is required'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const email of emails) {
      try {
        await sendEmail({
          email,
          subject,
          html: htmlContent
        });
        results.success.push(email);
      } catch (error) {
        results.failed.push({ email, reason: error.message });
      }
    }

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'bulk_email',
      metadata: {
        subject,
        recipientCount: emails.length,
        successCount: results.success.length
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Bulk email sent',
      data: {
        total: emails.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      }
    });

    logger.info(`Bulk email sent: ${results.success.length}/${emails.length} successful`);
  } catch (error) {
    next(error);
  }
};

export const bulkVerifyFundis = async (req, res, next) => {
  try {
    const { fundiIds: rawFundiIds, status, notes, action } = req.body;

    let fundiIds = [];
    if (Array.isArray(rawFundiIds)) fundiIds = rawFundiIds;
    else if (typeof rawFundiIds === 'string') {
      fundiIds = rawFundiIds.split(',').map(s => s.trim()).filter(Boolean);
    }

    // If action requests all or pending, compute fundiIds accordingly
    if ((!fundiIds || fundiIds.length === 0) && action) {
      if (action === 'verify_all') {
        const fundis = await Fundi.find({}).select('_id');
        fundiIds = fundis.map(f => String(f._id));
      } else if (action === 'verify_all_pending') {
        const fundis = await Fundi.find({ 'verification.overallStatus': { $in: ['submitted', 'under_review', 'pending'] } }).select('_id');
        fundiIds = fundis.map(f => String(f._id));
      }
    }

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to verify fundis'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    if (!Array.isArray(fundiIds) || fundiIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Fundi IDs array is required' });
    }

    for (const fundiId of fundiIds) {
      try {
        const fundi = await Fundi.findById(fundiId);
        if (!fundi) {
          results.failed.push({ fundiId, reason: 'Fundi not found' });
          continue;
        }

        fundi.verification.overallStatus = status;
        fundi.verification.verificationDate = new Date();
        fundi.verification.verifiedBy = req.user._id;
        await fundi.save();

        await Notification.create({
          recipient: fundi.user,
          recipientType: 'fundi',
          title: `Verification ${status}`,
          message: `Your fundi profile has been ${status}. ${notes || ''}`,
          notificationType: 'verification_update'
        });

        // Emit real-time notification for fundi
        try {
          const socketService = req.app.get('socketService');
          if (socketService && socketService.io) {
            socketService.io.to(String(fundi.user)).emit('notification:new', {
              recipient: fundi.user,
              title: `Verification ${status}`,
              message: `Your fundi profile has been ${status}. ${notes || ''}`,
              notificationType: 'verification_update'
            });
          }
        } catch (emitErr) {
          logger.warn('Failed to emit notification:new for fundi', fundi.user, emitErr.message);
        }

        results.success.push(fundiId);

        await AuditLog.logAction({
          userId: req.user._id,
          userRole: req.user.role,
          userEmail: req.user.email,
          action: `bulk_fundi_${status}`,
          targetEntity: {
            entityType: 'Fundi',
            entityId: fundiId
          },
          metadata: { notes },
          severity: 'high',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (error) {
        results.failed.push({ fundiId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk verification completed',
      data: {
        total: fundiIds.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      }
    });

    logger.info(`Bulk fundi verification: ${results.success.length}/${fundiIds.length} successful`);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateBookingStatus = async (req, res, next) => {
  try {
    const { bookingIds, status, notes } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to perform bulk booking updates'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const bookingId of bookingIds) {
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          results.failed.push({ bookingId, reason: 'Booking not found' });
          continue;
        }

        booking.status = status;
        if (notes) {
          booking.workflow.push({
            status,
            timestamp: new Date(),
            changedBy: req.user._id,
            notes
          });
        }
        await booking.save();

        results.success.push(bookingId);

        await AuditLog.logAction({
          userId: req.user._id,
          userRole: req.user.role,
          userEmail: req.user.email,
          action: 'bulk_booking_update',
          targetEntity: {
            entityType: 'Booking',
            entityId: bookingId
          },
          metadata: { status, notes },
          severity: 'high',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (error) {
        results.failed.push({ bookingId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk booking update completed',
      data: {
        total: bookingIds.length,
        successful: results.success.length,
        failed: results.failed.length,
        results
      }
    });

    logger.info(`Bulk booking update: ${results.success.length}/${bookingIds.length} successful`);
  } catch (error) {
    next(error);
  }
};

export const bulkExportData = async (req, res, next) => {
  try {
    const { dataType, filters, format = 'json' } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to export data'
      });
    }

    let data;
    let modelName;

    switch (dataType) {
      case 'users':
        data = await User.find(filters || {})
          .select('-password -twoFactorSecret')
          .lean();
        modelName = 'Users';
        break;

      case 'bookings':
        data = await Booking.find(filters || {})
          .populate('client', 'firstName lastName email')
          .populate('fundi', 'profession')
          .lean();
        modelName = 'Bookings';
        break;

      case 'fundis':
        data = await Fundi.find(filters || {})
          .populate('user', 'firstName lastName email phone')
          .lean();
        modelName = 'Fundis';
        break;

      case 'clients':
        data = await Client.find(filters || {})
          .populate('user', 'firstName lastName email phone')
          .lean();
        modelName = 'Clients';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid data type'
        });
    }

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'data_exported',
      metadata: {
        dataType,
        recordCount: data.length,
        format
      },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Data exported successfully',
      data: {
        type: dataType,
        model: modelName,
        count: data.length,
        records: data,
        exportedAt: new Date(),
        exportedBy: req.user.email
      }
    });

    logger.info(`Data exported: ${dataType}, ${data.length} records by ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};
