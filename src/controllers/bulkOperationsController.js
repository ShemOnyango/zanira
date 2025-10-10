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
    const { action, userIds, reason } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to perform bulk operations'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
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

    if (recipientIds && Array.isArray(recipientIds)) {
      recipients = recipientIds;
    } else if (recipientType) {
      const query = {};
      if (recipientType !== 'all') {
        query.role = recipientType;
      }
      const users = await User.find(query).select('_id');
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
        await Notification.create({
          recipient: recipientId,
          recipientType: recipientType || 'all',
          title,
          message,
          notificationType: notificationType || 'system_announcement',
          action: action || 'none',
          actionData: actionData || {},
          priority: 'normal'
        });
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
    const { fundiIds, status, notes } = req.body;

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
