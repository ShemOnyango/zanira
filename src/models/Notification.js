import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientType: {
    type: String,
    enum: ['client', 'fundi', 'admin', 'shop_owner'],
    required: true
  },

  // Notification Content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  notificationType: {
    type: String,
    enum: [
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      'payment_received',
      'payment_failed',
      'verification_approved',
      'verification_rejected',
      'new_message',
      'system_alert',
      'promotional',
      'security_alert'
    ],
    required: true
  },

  // Action & Data
  action: {
    type: String,
    enum: ['navigate', 'open_url', 'dismiss', 'reply'],
    default: 'dismiss'
  },
  actionData: {
    url: String,
    screen: String,
    params: mongoose.Schema.Types.Mixed
  },
  data: mongoose.Schema.Types.Mixed, // Additional data for the notification

  // Delivery Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  delivery: {
    push: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      error: String
    }
  },

  // Priority & Expiry
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiry: Date,

  // Read Status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,

  // Scheduling
  scheduledFor: Date,
  sentAt: Date,

  // Metadata
  source: {
    type: {
      type: String,
      enum: ['system', 'user', 'admin']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ recipientType: 1 });
notificationSchema.index({ notificationType: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ createdAt: -1 });

// Compound index for efficient querying
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiry && this.expiry < new Date();
});

// Virtual for canSend
notificationSchema.virtual('canSend').get(function() {
  return this.status === 'pending' && 
         (!this.scheduledFor || this.scheduledFor <= new Date()) &&
         !this.isExpired;
});

// Pre-save middleware to set default expiry
notificationSchema.pre('save', function(next) {
  if (!this.expiry) {
    // Default expiry based on priority
    const expiryDays = {
      'urgent': 1,
      'high': 3,
      'normal': 7,
      'low': 30
    };
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays[this.priority]);
    this.expiry = expiryDate;
  }
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to update delivery status
notificationSchema.methods.updateDeliveryStatus = function(channel, status, error = null) {
  if (this.delivery[channel]) {
    this.delivery[channel].sent = status === 'sent';
    this.delivery[channel].delivered = status === 'delivered';
    this.delivery[channel].error = error || undefined;
  }

  if (status === 'sent') {
    this.sentAt = new Date();
  }

  // Update overall status
  if (status === 'delivered') {
    this.status = 'delivered';
  } else if (status === 'failed') {
    this.status = 'failed';
  } else {
    this.status = status;
  }

  return this.save();
};

export default mongoose.model('Notification', notificationSchema);