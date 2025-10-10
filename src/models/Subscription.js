import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['fundi', 'client', 'shop_owner'],
    required: true
  },

  plan: {
    name: {
      type: String,
      enum: ['basic', 'professional', 'premium', 'enterprise'],
      required: true
    },
    tier: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'KES'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },

  features: {
    maxJobsPerMonth: { type: Number, default: -1 },
    maxActiveJobs: { type: Number, default: -1 },
    commissionRate: { type: Number, default: 10 },
    priorityListing: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    customerSupport: { type: String, enum: ['basic', 'priority', '24/7'], default: 'basic' },
    videoConsultations: { type: Boolean, default: false },
    bulkOperations: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    dedicatedAccountManager: { type: Boolean, default: false }
  },

  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'suspended', 'trial'],
    default: 'trial'
  },

  billing: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    nextBillingDate: Date,
    lastPaymentDate: Date,
    autoRenew: {
      type: Boolean,
      default: true
    },
    trialEndsAt: Date,
    cancelledAt: Date,
    cancelReason: String
  },

  usage: {
    jobsThisMonth: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    apiCallsThisMonth: { type: Number, default: 0 },
    lastResetDate: Date
  },

  payment: {
    method: {
      type: String,
      enum: ['mpesa', 'card', 'bank', 'invoice']
    },
    lastTransactionId: String,
    failedPayments: { type: Number, default: 0 }
  },

  history: [{
    action: {
      type: String,
      enum: ['created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'suspended', 'resumed']
    },
    fromPlan: String,
    toPlan: String,
    timestamp: Date,
    reason: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'billing.endDate': 1 });
subscriptionSchema.index({ 'plan.name': 1 });

subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.billing.endDate > new Date();
});

subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.billing.endDate) return 0;
  const diff = this.billing.endDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

subscriptionSchema.methods.canPerformAction = function(action) {
  if (this.status !== 'active') return false;

  switch (action) {
    case 'create_job':
      return this.usage.jobsThisMonth < this.features.maxJobsPerMonth || this.features.maxJobsPerMonth === -1;
    case 'video_call':
      return this.features.videoConsultations;
    case 'bulk_operations':
      return this.features.bulkOperations;
    case 'api_access':
      return this.features.apiAccess;
    default:
      return true;
  }
};

subscriptionSchema.methods.resetMonthlyUsage = async function() {
  this.usage.jobsThisMonth = 0;
  this.usage.apiCallsThisMonth = 0;
  this.usage.lastResetDate = new Date();
  await this.save();
};

export default mongoose.model('Subscription', subscriptionSchema);
