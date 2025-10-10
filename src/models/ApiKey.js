import mongoose from 'mongoose';
import crypto from 'crypto';

const apiKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  key: {
    type: String,
    required: true,
    unique: true
  },

  keyHash: {
    type: String,
    required: true,
    select: false
  },

  type: {
    type: String,
    enum: ['public', 'secret', 'admin'],
    default: 'public'
  },

  permissions: [{
    type: String,
    enum: [
      'read:bookings', 'write:bookings', 'delete:bookings',
      'read:users', 'write:users', 'delete:users',
      'read:payments', 'write:payments',
      'read:analytics', 'write:analytics',
      'admin:all'
    ]
  }],

  status: {
    type: String,
    enum: ['active', 'revoked', 'expired', 'suspended'],
    default: 'active'
  },

  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 }
  },

  usage: {
    totalRequests: { type: Number, default: 0 },
    lastUsedAt: Date,
    requestsToday: { type: Number, default: 0 },
    lastResetDate: Date
  },

  ipWhitelist: [String],

  allowedOrigins: [String],

  expiresAt: Date,

  lastRotatedAt: Date,

  rotationSchedule: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['30days', '60days', '90days', 'never'],
      default: 'never'
    },
    nextRotationDate: Date
  },

  metadata: mongoose.Schema.Types.Mixed,

  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revocationReason: String
}, {
  timestamps: true
});

apiKeySchema.index({ user: 1 });
// `key` is unique on the field definition; avoid re-declaring a single-field index.
apiKeySchema.index({ keyHash: 1 });
apiKeySchema.index({ status: 1 });
apiKeySchema.index({ expiresAt: 1 });

apiKeySchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

apiKeySchema.virtual('needsRotation').get(function() {
  if (!this.rotationSchedule.enabled || !this.rotationSchedule.nextRotationDate) return false;
  return this.rotationSchedule.nextRotationDate < new Date();
});

apiKeySchema.statics.generateKey = function(prefix = 'zbapi') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
};

apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

apiKeySchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('admin:all')) return true;
  return this.permissions.includes(permission);
};

apiKeySchema.methods.canMakeRequest = function() {
  if (this.status !== 'active') return { allowed: false, reason: 'Key is not active' };
  if (this.isExpired) return { allowed: false, reason: 'Key has expired' };

  return { allowed: true };
};

apiKeySchema.methods.recordUsage = async function() {
  this.usage.totalRequests += 1;
  this.usage.lastUsedAt = new Date();

  const today = new Date().toDateString();
  const lastReset = this.usage.lastResetDate ? this.usage.lastResetDate.toDateString() : null;

  if (today !== lastReset) {
    this.usage.requestsToday = 1;
    this.usage.lastResetDate = new Date();
  } else {
    this.usage.requestsToday += 1;
  }

  await this.save();
};

apiKeySchema.methods.revoke = async function(revokedBy, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revocationReason = reason;
  await this.save();
};

apiKeySchema.methods.rotate = async function() {
  const newKey = this.constructor.generateKey();
  const newKeyHash = this.constructor.hashKey(newKey);

  this.key = newKey;
  this.keyHash = newKeyHash;
  this.lastRotatedAt = new Date();

  if (this.rotationSchedule.enabled) {
    const days = parseInt(this.rotationSchedule.frequency);
    this.rotationSchedule.nextRotationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  await this.save();

  return newKey;
};

export default mongoose.model('ApiKey', apiKeySchema);
