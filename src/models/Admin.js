import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Admin Role & Permissions
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'verification_officer', 'support_officer', 'finance_officer', 'moderator', 'secretary'],
    required: true
  },
  permissions: {
    userManagement: { type: Boolean, default: false },
    fundiVerification: { type: Boolean, default: false },
    clientVerification: { type: Boolean, default: false },
    shopVerification: { type: Boolean, default: false },
    disputeManagement: { type: Boolean, default: false },
    paymentManagement: { type: Boolean, default: false },
    contentModeration: { type: Boolean, default: false },
    analyticsView: { type: Boolean, default: false },
    systemSettings: { type: Boolean, default: false }
  },

  // Admin Statistics
  stats: {
    verifiedFundis: { type: Number, default: 0 },
    resolvedDisputes: { type: Number, default: 0 },
    processedPayments: { type: Number, default: 0 },
    handledTickets: { type: Number, default: 0 }
  },

  // Assigned Tasks
  assignedTasks: {
    verifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Verification' }],
    disputes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dispute' }],
    supportTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }]
  },

  // Security
  lastActive: Date,
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String,
    location: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: true
  },

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' }
    }
  }
}, {
  timestamps: true
});

// Indexes
// `user` is unique on the schema; avoid duplicate index declaration
adminSchema.index({ role: 1 });
adminSchema.index({ 'permissions.fundiVerification': 1 });

// Pre-save middleware to set permissions based on role
adminSchema.pre('save', function(next) {
  switch (this.role) {
    case 'super_admin':
      this.permissions = {
        userManagement: true,
        fundiVerification: true,
        clientVerification: true,
        shopVerification: true,
        disputeManagement: true,
        paymentManagement: true,
        contentModeration: true,
        analyticsView: true,
        systemSettings: true
      };
      break;
    case 'verification_officer':
      this.permissions = {
        fundiVerification: true,
        clientVerification: true,
        shopVerification: true,
        userManagement: false,
        disputeManagement: false,
        paymentManagement: false,
        contentModeration: false,
        analyticsView: true,
        systemSettings: false
      };
      break;
    case 'support_officer':
      this.permissions = {
        userManagement: false,
        fundiVerification: false,
        clientVerification: false,
        shopVerification: false,
        disputeManagement: true,
        paymentManagement: false,
        contentModeration: true,
        analyticsView: true,
        systemSettings: false
      };
      break;
    case 'finance_officer':
      this.permissions = {
        userManagement: false,
        fundiVerification: false,
        clientVerification: false,
        shopVerification: false,
        disputeManagement: false,
        paymentManagement: true,
        contentModeration: false,
        analyticsView: true,
        systemSettings: false
      };
      break;
    case 'moderator':
      this.permissions = {
        userManagement: false,
        fundiVerification: false,
        clientVerification: false,
        shopVerification: false,
        disputeManagement: true,
        paymentManagement: false,
        contentModeration: true,
        analyticsView: true,
        systemSettings: false
      };
      break;
    default:
      // Custom permissions can be set manually
      break;
  }
  next();
});

export default mongoose.model('Admin', adminSchema);