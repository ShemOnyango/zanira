import admin from 'firebase-admin';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailUtils.js';
import logger from '../middleware/logger.js';
import { getSocketService } from './socketAccessor.js';
import { normalizeRole, resolveRecipientType } from '../utils/roleUtils.js';

// Initialize Firebase Admin (safe guard for missing env vars in dev)
const initializeFirebase = () => {
  // Support both `FIREBASE_*` env variables and the unprefixed keys that exist in
  // the project's `.env` (e.g. `project_id`, `private_key`, `client_email`).
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.project_id || process.env.FIREBASE_PROJECTID;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || process.env.private_key || process.env.FIREBASE_PRIVATEKEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email;

  // Require minimal credentials to initialize Firebase Admin
  const hasCreds = projectId && privateKeyRaw && clientEmail;
  if (!hasCreds) {
    logger.warn('Firebase Admin not initialized: missing FIREBASE_PROJECT_ID/project_id, FIREBASE_PRIVATE_KEY/private_key, or FIREBASE_CLIENT_EMAIL/client_email');
    return;
  }

  if (!admin.apps.length) {
    // Normalize private key newlines. The value in .env often contains literal
    // `\n` sequences which need to be converted to actual newlines.
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || process.env.type || 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || process.env.private_key_id,
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || process.env.client_id,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || process.env.client_x509_cert_url
    };

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('Firebase Admin initialized successfully');
    } catch (error) {
      logger.error('Firebase Admin initialization failed:', error);
    }
  }
};
// If a GOOGLE_APPLICATION_CREDENTIALS env var points to a JSON file, allow admin
// to initialize with Application Default Credentials as a fallback.
if (!admin.apps.length) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      logger.info('Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS');
    }
  } catch (err) {
    // ignore - initializeFirebase() will already have logged problems
  }
}

initializeFirebase();

class NotificationService {
  constructor() {
    this.channels = {
      PUSH: 'push',
      EMAIL: 'email',
      SMS: 'sms',
      IN_APP: 'in_app'
    };
  }

  // Send notification through multiple channels
  async sendNotification(notificationData) {
    try {
      const {
        recipient,
        recipientType,
        title,
        message,
        notificationType,
        action,
        actionData,
        data,
        channels = ['in_app', 'push', 'email'],
        priority = 'normal'
      } = notificationData;

      // Ensure recipientType is normalized to allowed enum values
      const resolvedRecipientType = resolveRecipientType(recipientType) || normalizeRole((await User.findById(recipient)).role);

      // Create in-app notification
      const notification = await Notification.create({
        recipient,
        recipientType: resolvedRecipientType,
        title,
        message,
        notificationType,
        action,
        actionData,
        data,
        priority
      });

      // Emit real-time in-app notification to recipient if socket service is available
      try {
        const socketService = getSocketService();
        if (socketService && socketService.io) {
          socketService.io.to(String(recipient)).emit('notification:new', notification);
        }
      } catch (emitErr) {
        logger.warn('Failed to emit notification:new from notificationService', emitErr.message);
      }

      // Send through configured channels
      const results = {};

      for (const channel of channels) {
        try {
          switch (channel) {
            case this.channels.PUSH:
              results.push = await this.sendPushNotification(notification);
              break;
            case this.channels.EMAIL:
              results.email = await this.sendEmailNotification(notification);
              break;
            case this.channels.SMS:
              results.sms = await this.sendSMSNotification(notification);
              break;
            case this.channels.IN_APP:
              results.in_app = { success: true, notificationId: notification._id };
              break;
          }
        } catch (error) {
          logger.error(`Error sending ${channel} notification:`, error);
          results[channel] = { success: false, error: error.message };
        }
      }

      // Update notification delivery status
      await this.updateDeliveryStatus(notification._id, results);

      logger.info(`Notification sent to ${recipient} via ${channels.join(', ')}`);

      return {
        success: true,
        notificationId: notification._id,
        channelResults: results
      };
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send push notification via FCM
  async sendPushNotification(notification) {
    try {
      const user = await User.findById(notification.recipient).select('deviceTokens');
      if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
        return { success: false, error: 'No device tokens found' };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          notificationId: notification._id.toString(),
          type: notification.notificationType,
          action: notification.action || '',
          actionData: JSON.stringify(notification.actionData || {}),
          data: JSON.stringify(notification.data || {})
        },
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal'
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens: user.deviceTokens
      };

      const response = await admin.messaging().sendMulticast(message);

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(user.deviceTokens[idx]);
          }
        });

        // Remove failed tokens from user
        if (failedTokens.length > 0) {
          await User.findByIdAndUpdate(notification.recipient, {
            $pull: { deviceTokens: { $in: failedTokens } }
          });
          logger.warn(`Removed ${failedTokens.length} failed device tokens for user ${notification.recipient}`);
        }
      }

      return {
        success: true,
        sentCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(notification) {
    try {
      const user = await User.findById(notification.recipient).select('email firstName lastName');
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const emailTemplate = this.getEmailTemplate(notification);
      
      const result = await sendEmail({
        email: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });

      return {
        success: result.success,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Error sending email notification:', error);
      throw error;
    }
  }

  // Send SMS notification (integration with Africa's Talking)
  async sendSMSNotification(notification) {
    try {
      const user = await User.findById(notification.recipient).select('phone');
      if (!user || !user.phone) {
        return { success: false, error: 'User phone not found' };
      }

      // This would integrate with Africa's Talking SMS API
      // For now, we'll log and return success
      logger.info(`SMS would be sent to ${user.phone}: ${notification.message}`);

      return {
        success: true,
        message: 'SMS notification logged'
      };
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  // Get appropriate email template for notification type
  getEmailTemplate(notification) {
    //const user = { firstName: 'User', lastName: '' }; // Would be populated from user data
    
    const templates = {
      booking_created: {
        subject: 'New Booking Request - Zanira BuildLink',
        html: `
          <h2>New Booking Request</h2>
          <p>Hello,</p>
          <p>You have a new booking request: <strong>${notification.title}</strong></p>
          <p>${notification.message}</p>
          <p>Login to your dashboard to view details and respond.</p>
        `
      },
      booking_confirmed: {
        subject: 'Booking Confirmed - Zanira BuildLink',
        html: `
          <h2>Booking Confirmed</h2>
          <p>Your booking has been confirmed!</p>
          <p><strong>${notification.title}</strong></p>
          <p>${notification.message}</p>
        `
      },
      payment_received: {
        subject: 'Payment Received - Zanira BuildLink',
        html: `
          <h2>Payment Received</h2>
          <p>Great news! Payment has been received for your service.</p>
          <p>${notification.message}</p>
        `
      },
      default: {
        subject: notification.title,
        html: `
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
        `
      }
    };

    return templates[notification.notificationType] || templates.default;
  }

  // Update notification delivery status
  async updateDeliveryStatus(notificationId, results) {
    try {
      const update = {
        'delivery.push.sent': results.push?.success || false,
        'delivery.push.delivered': results.push?.success || false,
        'delivery.push.error': results.push?.error || null,
        'delivery.email.sent': results.email?.success || false,
        'delivery.email.delivered': results.email?.success || false,
        'delivery.email.error': results.email?.error || null,
        'delivery.sms.sent': results.sms?.success || false,
        'delivery.sms.delivered': results.sms?.success || false,
        'delivery.sms.error': results.sms?.error || null
      };

      // Determine overall status
      if (results.in_app?.success) {
        update.status = 'delivered';
      } else if (Object.values(results).some(result => result?.success)) {
        update.status = 'sent';
      } else {
        update.status = 'failed';
      }

      await Notification.findByIdAndUpdate(notificationId, update);
    } catch (error) {
      logger.error('Error updating notification delivery status:', error);
    }
  }

  // Bulk notifications for multiple users
  async sendBulkNotifications(users, notificationData) {
    const results = [];

    for (const user of users) {
      try {
        // Ensure recipientType uses canonical enum
        const resolvedRecipientType = resolveRecipientType(notificationData.recipientType) || normalizeRole(user.role);
        const result = await this.sendNotification({
          ...notificationData,
          recipient: user._id || user,
          recipientType: resolvedRecipientType
        });
        results.push({ userId: user._id || user, success: true, result });
      } catch (error) {
        results.push({ userId: user._id || user, success: false, error: error.message });
      }
    }

    return results;
  }

  // Schedule notification for future delivery
  async scheduleNotification(notificationData, deliverAt) {
    try {
      const notification = await Notification.create({
        ...notificationData,
        status: 'pending',
        scheduledFor: deliverAt
      });

      // In production, this would use a job queue like Bull or Agenda
      // For now, we'll store it and process via cron job
      logger.info(`Notification scheduled for ${deliverAt}: ${notification._id}`);

      return notification;
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      read,
      notificationType,
      priority
    } = options;

    const filter = { recipient: userId };
    
    if (read !== undefined) filter.read = read;
    if (notificationType) filter.notificationType = notificationType;
    if (priority) filter.priority = priority;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false
    });

    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );

    return result.modifiedCount;
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  // Get notification statistics
  async getNotificationStats(userId, period = '30d') {
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await Notification.aggregate([
      {
        $match: {
          recipient: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$notificationType',
          count: { $sum: 1 },
          read: { $sum: { $cond: ['$read', 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }
        }
      },
      {
        $project: {
          notificationType: '$_id',
          count: 1,
          read: 1,
          delivered: 1,
          readRate: { $divide: ['$read', '$count'] }
        }
      }
    ]);

    const totalStats = await Notification.aggregate([
      {
        $match: {
          recipient: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalRead: { $sum: { $cond: ['$read', 1, 0] } },
          totalDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }
        }
      }
    ]);

    return {
      byType: stats,
      total: totalStats[0] || { total: 0, totalRead: 0, totalDelivered: 0 },
      period
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;