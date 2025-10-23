// controllers/notificationController.js
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { normalizeRole, resolveRecipientType } from '../utils/roleUtils.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// @desc    Get all notifications for current user with pagination and filtering
// @route   GET /api/v1/notifications
// @access  Private
export const getUserNotifications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    read,
    priority,
    startDate,
    endDate
  } = req.query;

  const skip = (page - 1) * limit;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build filter query
  let filter = {
    recipient: userId,
    recipientType: resolveRecipientType(userRole) || normalizeRole(userRole)
  };

  // Apply filters
  if (type) filter.notificationType = type;
  if (status) filter.status = status;
  if (read !== undefined) filter.read = read === 'true';
  if (priority) filter.priority = priority;
  
  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Get notifications with pagination
  const notifications = await Notification.find(filter)
    .populate('source.user', 'name email role avatar')
    .sort({ createdAt: -1, priority: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get total count for pagination
  const total = await Notification.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  // Format response with additional data
  const formattedNotifications = notifications.map(notification => ({
    ...notification,
    isExpired: notification.expiry && new Date(notification.expiry) < new Date()
  }));

  res.status(200).json({
    success: true,
    data: formattedNotifications,
    pagination: {
      current: parseInt(page),
      pages: totalPages,
      total,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// @desc    Get notification statistics for current user
// @route   GET /api/v1/notifications/stats
// @access  Private
export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  const stats = await Notification.aggregate([
    {
      $match: {
        recipient: new mongoose.Types.ObjectId(userId),
        recipientType: userRole
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
        },
        highPriority: {
          $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
        },
        urgentPriority: {
          $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
        },
        byType: {
          $push: {
            type: '$notificationType',
            count: 1
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        unread: 1,
        highPriority: 1,
        urgentPriority: 1,
        typeBreakdown: {
          $arrayToObject: {
            $map: {
              input: '$byType',
              as: 'item',
              in: {
                k: '$$item.type',
                v: {
                  $sum: '$$item.count'
                }
              }
            }
          }
        }
      }
    }
  ]);

  const defaultStats = {
    total: 0,
    unread: 0,
    highPriority: 0,
    urgentPriority: 0,
    typeBreakdown: {}
  };

  res.status(200).json({
    success: true,
    data: stats[0] || defaultStats
  });
});

// @desc    Mark a notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  await notification.markAsRead();

  // TODO: Emit real-time event for notification update
  // req.app.get('io').to(req.user._id.toString()).emit('notification:read', { notificationId: notification._id });

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read for current user
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );

  // TODO: Emit real-time event for all notifications read
  // req.app.get('io').to(req.user._id.toString()).emit('notifications:allRead');

  res.status(200).json({
    success: true,
    data: {
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    }
  });
});

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  // TODO: Emit real-time event for notification deletion
  // req.app.get('io').to(req.user._id.toString()).emit('notification:deleted', { notificationId: req.params.id });

  res.status(200).json({
    success: true,
    data: {
      message: 'Notification deleted successfully',
      deletedNotification: notification
    }
  });
});

// ============================================================================
// NOTIFICATION SERVICE FUNCTIONS
// These functions are used by other controllers to send notifications
// ============================================================================

// @desc    Create and send a notification
// @route   Internal function
// @access  Private (Internal)
export const createNotification = asyncHandler(async (notificationData) => {
  const {
    recipient,
    recipientType,
    title,
    message,
    notificationType,
    priority = 'normal',
    action = 'dismiss',
    actionData,
    data,
    source = { type: 'system' },
    tags = [],
    scheduledFor
  } = notificationData;

  // Validate recipient exists and is active
  const recipientUser = await User.findById(recipient);
  if (!recipientUser || recipientUser.status !== 'active') {
    throw new Error('Recipient not found or inactive');
  }

  const resolvedRecipientType = resolveRecipientType(recipientType) || normalizeRole(recipientType) || normalizeRole((await User.findById(recipient)).role);

  const notification = await Notification.create({
    recipient,
    recipientType: resolvedRecipientType,
    title,
    message,
    notificationType,
    priority,
    action,
    actionData,
    data,
    source,
    tags,
    scheduledFor,
    status: scheduledFor ? 'pending' : 'pending'
  });

  // If not scheduled, send immediately
  if (!scheduledFor) {
    await sendNotification(notification);
  }

  return notification;
});

// @desc    Send notification through all available channels
// @route   Internal function
// @access  Private (Internal)
export const sendNotification = asyncHandler(async (notification) => {
  if (!notification.canSend) {
    throw new Error('Notification cannot be sent at this time');
  }

  const recipient = await User.findById(notification.recipient);
  
  try {
    // Send push notification
    await sendPushNotification(notification, recipient);
    
    // Send email notification for important events
    if (['high', 'urgent'].includes(notification.priority) || 
        ['payment_received', 'booking_confirmed', 'verification_approved'].includes(notification.notificationType)) {
      await sendEmailNotification(notification, recipient);
    }
    
    // Send SMS for urgent notifications
    if (notification.priority === 'urgent') {
      await sendSMSNotification(notification, recipient);
    }

    // Update notification status
    await notification.updateDeliveryStatus('push', 'sent');
    
  } catch (error) {
    console.error('Failed to send notification:', error);
    await notification.updateDeliveryStatus('push', 'failed', error.message);
    throw error;
  }
});

// @desc    Send push notification
// @route   Internal function
// @access  Private (Internal)
const sendPushNotification = async (notification, recipient) => {
  // TODO: Integrate with Firebase Cloud Messaging (FCM) or similar service
  // This is a placeholder implementation
  
  const pushData = {
    to: recipient._id, // This would be the device token in real implementation
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: notification._id.toString(),
      type: notification.notificationType,
      action: notification.action,
      actionData: notification.actionData,
      priority: notification.priority
    },
    priority: notification.priority === 'urgent' ? 'high' : 'normal'
  };

  // Emit real-time event via Socket.io
  // req.app.get('io').to(recipient._id.toString()).emit('notification:new', notification);

  console.log('Push notification sent:', pushData);
  return Promise.resolve();
};

// @desc    Send email notification
// @route   Internal function
// @access  Private (Internal)
const sendEmailNotification = async (notification, recipient) => {
  // TODO: Integrate with email service (Nodemailer, SendGrid, etc.)
  console.log('Email notification sent to:', recipient.email);
  return Promise.resolve();
};

// @desc    Send SMS notification
// @route   Internal function
// @access  Private (Internal)
const sendSMSNotification = async (notification, recipient) => {
  // TODO: Integrate with SMS service (Africa's Talking, Twilio, etc.)
  console.log('SMS notification sent to:', recipient.phone);
  return Promise.resolve();
};

// ============================================================================
// SPECIFIC NOTIFICATION CREATORS
// These functions create specific types of notifications for the platform
// ============================================================================

// @desc    Create booking-related notifications
// @route   Internal function
// @access  Private (Internal)
export const createBookingNotification = asyncHandler(async (booking, type, additionalData = {}) => {
  const bookingNotifications = {
    booking_created: {
      client: {
        title: 'Booking Request Sent',
        message: `Your booking request for "${booking.description}" has been received and is being processed.`,
        priority: 'normal'
      },
      admin: {
        title: 'New Booking Request',
        message: `New booking request from ${additionalData.clientName} for "${booking.description}".`,
        priority: 'high'
      }
    },
    booking_confirmed: {
      client: {
        title: 'Booking Confirmed!',
        message: `Your booking for "${booking.description}" has been confirmed. Your fundi will contact you soon.`,
        priority: 'high'
      },
      fundi: {
        title: 'New Job Assigned',
        message: `You have been assigned a new job: "${booking.description}". Check your bookings for details.`,
        priority: 'high'
      }
    },
    booking_cancelled: {
      client: {
        title: 'Booking Cancelled',
        message: `Your booking for "${booking.description}" has been cancelled.`,
        priority: 'normal'
      },
      fundi: {
        title: 'Booking Cancelled',
        message: `The booking for "${booking.description}" has been cancelled.`,
        priority: 'normal'
      },
      admin: {
        title: 'Booking Cancelled',
        message: `Booking ${booking._id} has been cancelled.`,
        priority: 'normal'
      }
    },
    booking_completed: {
      client: {
        title: 'Job Completed!',
        message: `The job "${booking.description}" has been marked as completed. Please confirm and release payment.`,
        priority: 'high',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      },
      fundi: {
        title: 'Job Completed',
        message: `You've marked "${booking.description}" as completed. Waiting for client confirmation.`,
        priority: 'normal'
      },
      admin: {
        title: 'Job Completed',
        message: `Booking ${booking._id} has been completed. Waiting for client confirmation.`,
        priority: 'normal'
      }
    }
  };

  const notificationConfig = bookingNotifications[type];
  if (!notificationConfig) {
    throw new Error(`Invalid booking notification type: ${type}`);
  }

  const notifications = [];

  // Create notifications for relevant parties
  for (const [role, config] of Object.entries(notificationConfig)) {
    let recipientId;
    
    if (role === 'client') {
      recipientId = booking.client;
    } else if (role === 'fundi' && booking.fundi) {
      recipientId = booking.fundi;
    } else if (role === 'admin') {
      // Find available admin
      const admin = await User.findOne({ role: 'admin', status: 'active' });
      if (admin) recipientId = admin._id;
    }

    if (recipientId) {
      const notification = await createNotification({
        recipient: recipientId,
        recipientType: role,
        title: config.title,
        message: config.message,
        notificationType: type,
        priority: config.priority,
        action: config.action || 'dismiss',
        actionData: config.actionData,
        data: {
          bookingId: booking._id,
          ...additionalData
        },
        source: {
          type: 'system',
          user: additionalData.triggeredBy
        },
        tags: ['booking', type]
      });

      notifications.push(notification);
    }
  }

  return notifications;
});

// @desc    Create payment-related notifications
// @route   Internal function
// @access  Private (Internal)
export const createPaymentNotification = asyncHandler(async (payment, type, additionalData = {}) => {
  const paymentNotifications = {
    payment_received: {
      client: {
        title: 'Payment Successful',
        message: `Your payment of KES ${payment.amount} has been received successfully.`,
        priority: 'high'
      },
      admin: {
        title: 'Payment Received',
        message: `Payment of KES ${payment.amount} received for booking ${payment.booking}.`,
        priority: 'normal'
      }
    },
    payment_failed: {
      client: {
        title: 'Payment Failed',
        message: `Your payment of KES ${payment.amount} failed. Please try again or use a different payment method.`,
        priority: 'high',
        action: 'navigate',
        actionData: {
          screen: 'PaymentRetry',
          params: { paymentId: payment._id }
        }
      },
      admin: {
        title: 'Payment Failed',
        message: `Payment of KES ${payment.amount} failed for booking ${payment.booking}.`,
        priority: 'normal'
      }
    }
  };

  const config = paymentNotifications[type];
  if (!config) {
    throw new Error(`Invalid payment notification type: ${type}`);
  }

  const notifications = [];

  for (const [role, notificationConfig] of Object.entries(config)) {
    let recipientId;
    
    if (role === 'client') {
      recipientId = payment.user;
    } else if (role === 'admin') {
      const admin = await User.findOne({ role: 'admin', status: 'active' });
      if (admin) recipientId = admin._id;
    }

    if (recipientId) {
      const notification = await createNotification({
        recipient: recipientId,
        recipientType: role,
        ...notificationConfig,
        notificationType: type,
        data: {
          paymentId: payment._id,
          bookingId: payment.booking,
          amount: payment.amount,
          ...additionalData
        },
        source: {
          type: 'system'
        },
        tags: ['payment', type]
      });

      notifications.push(notification);
    }
  }

  return notifications;
});

// @desc    Create verification-related notifications
// @route   Internal function
// @access  Private (Internal)
export const createVerificationNotification = asyncHandler(async (user, type, additionalData = {}) => {
  const verificationNotifications = {
    verification_approved: {
      title: 'Verification Approved!',
      message: 'Your account verification has been approved. You can now access all platform features.',
      priority: 'high'
    },
    verification_rejected: {
      title: 'Verification Requires Updates',
      message: `Your verification requires additional information. Reason: ${additionalData.reason || 'Please check your submission'}`,
      priority: 'high',
      action: 'navigate',
      actionData: {
        screen: 'Verification',
        params: { requiresUpdate: true }
      }
    }
  };

  const config = verificationNotifications[type];
  if (!config) {
    throw new Error(`Invalid verification notification type: ${type}`);
  }

  const notification = await createNotification({
    recipient: user._id,
    recipientType: normalizeRole(user.role),
    ...config,
    notificationType: type,
    data: {
      userId: user._id,
      ...additionalData
    },
    source: {
      type: 'admin',
      user: additionalData.reviewedBy
    },
    tags: ['verification', type]
  });

  return notification;
});

// @desc    Create new message notification
// @route   Internal function
// @access  Private (Internal)
export const createMessageNotification = asyncHandler(async (chat, message, recipientId) => {
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  const sender = await User.findById(message.sender);
  const notification = await createNotification({
    recipient: recipientId,
    recipientType: normalizeRole(recipient.role),
    title: `New message from ${sender?.name || 'User'}`,
    message: message.content.length > 50 
      ? `${message.content.substring(0, 50)}...` 
      : message.content,
    notificationType: 'new_message',
    priority: 'normal',
    action: 'navigate',
    actionData: {
      screen: 'Chat',
      params: { chatId: chat._id }
    },
    data: {
      chatId: chat._id,
      messageId: message._id || message.messageId,
      senderId: message.sender
    },
    source: {
      type: 'user',
      user: message.sender
    },
    tags: ['message', 'chat']
  });

  return notification;
});

// @desc    Clean up expired notifications (to be run as cron job)
// @route   Internal function
// @access  Private (Internal)
export const cleanupExpiredNotifications = asyncHandler(async () => {
  const result = await Notification.deleteMany({
    expiry: { $lt: new Date() }
  });

  console.log(`Cleaned up ${result.deletedCount} expired notifications`);
  return result;
});

// @desc    Update notification preferences for the current user (client/fundi)
// @route   PATCH /api/v1/notifications/preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req, res) => {
  const prefs = req.body;
  const role = req.user.role;

  // Validate simple shape: expect an object
  if (!prefs || typeof prefs !== 'object') {
    res.status(400);
    throw new Error('Invalid preferences payload');
  }

  if (role === 'client') {
    // Update Client.preferences.notifications
    const client = await mongoose.model('Client').findOneAndUpdate(
      { user: req.user._id },
      { $set: { 'preferences.notifications': prefs } },
      { new: true, upsert: false }
    );

    if (!client) {
      res.status(404);
      throw new Error('Client profile not found');
    }

    return res.status(200).json({ success: true, data: client.preferences });
  }

  if (role === 'fundi') {
    // Update Fundi.preferences (map to email/push/sms keys if provided)
    const fundi = await mongoose.model('Fundi').findOne({ user: req.user._id });
    if (!fundi) {
      res.status(404);
      throw new Error('Fundi profile not found');
    }

    // Merge provided keys into existing preferences
    fundi.preferences = {
      ...fundi.preferences.toObject?.() || fundi.preferences,
      ...prefs
    };

    await fundi.save();
    return res.status(200).json({ success: true, data: fundi.preferences });
  }

  // Fallback: store preferences on User.notificationsPreferences
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { notificationsPreferences: prefs } }, { new: true });
  return res.status(200).json({ success: true, data: user.notificationsPreferences });
});