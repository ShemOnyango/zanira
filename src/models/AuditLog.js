import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  userEmail: String,

  action: {
    type: String,
    required: true,
    enum: [
      'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_activated',
      'booking_created', 'booking_updated', 'booking_cancelled', 'booking_completed',
      'payment_processed', 'payment_refunded', 'payment_released',
      'fundi_verified', 'fundi_rejected', 'fundi_suspended',
      'shop_verified', 'shop_rejected', 'shop_suspended',
      'settings_changed', 'role_changed', 'permissions_changed',
      'bulk_operation', 'report_generated', 'export_created',
      'api_key_generated', 'api_key_revoked',
      'dispute_created', 'dispute_resolved',
      'subscription_created', 'subscription_cancelled',
      'wallet_transaction', 'withdrawal_processed',
      'security_alert', 'login_attempt', 'password_reset',
      'data_accessed', 'data_exported', 'data_deleted'
    ]
  },

  targetEntity: {
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    entityDescription: String
  },

  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },

  errorMessage: String,

  metadata: mongoose.Schema.Types.Mixed,

  requestData: {
    method: String,
    endpoint: String,
    body: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    params: mongoose.Schema.Types.Mixed
  },

  responseData: {
    statusCode: Number,
    responseTime: Number
  },

  tags: [String],

  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ 'targetEntity.entityType': 1, 'targetEntity.entityId': 1 });
auditLogSchema.index({ tags: 1 });

auditLogSchema.statics.logAction = async function(logData) {
  try {
    const log = await this.create({
      user: logData.userId,
      userRole: logData.userRole,
      userEmail: logData.userEmail,
      action: logData.action,
      targetEntity: logData.targetEntity,
      changes: logData.changes,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      location: logData.location,
      severity: logData.severity || 'medium',
      status: logData.status || 'success',
      errorMessage: logData.errorMessage,
      metadata: logData.metadata,
      requestData: logData.requestData,
      responseData: logData.responseData,
      tags: logData.tags || [],
      timestamp: new Date()
    });
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

export default mongoose.model('AuditLog', auditLogSchema);
