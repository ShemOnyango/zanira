import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  referralCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },

  referredEmail: String,
  referredPhone: String,

  registeredAt: Date,
  completedAt: Date,

  rewards: {
    referrerReward: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ['cash', 'discount', 'credits', 'free_month'] },
      claimed: { type: Boolean, default: false },
      claimedAt: Date
    },
    referredReward: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ['cash', 'discount', 'credits', 'free_month'] },
      claimed: { type: Boolean, default: false },
      claimedAt: Date
    }
  },

  conditions: {
    minimumBookings: { type: Number, default: 1 },
    minimumSpend: { type: Number, default: 0 },
    bookingsCompleted: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },

  expiresAt: Date,

  campaign: {
    name: String,
    code: String
  },

  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

referralSchema.index({ referrer: 1 });
referralSchema.index({ referredUser: 1 });
// `referralCode` is already declared `unique: true` on the field - avoid duplicate index
referralSchema.index({ status: 1 });
referralSchema.index({ expiresAt: 1 });

referralSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

referralSchema.methods.checkCompletion = async function() {
  if (this.status === 'completed') return true;

  const meetsConditions =
    this.conditions.bookingsCompleted >= this.conditions.minimumBookings &&
    this.conditions.totalSpent >= this.conditions.minimumSpend;

  if (meetsConditions) {
    this.status = 'completed';
    this.completedAt = new Date();
    await this.save();
    return true;
  }

  return false;
};

referralSchema.statics.generateReferralCode = async function() {
  let code;
  let exists = true;

  while (exists) {
    code = 'ZB' + Math.random().toString(36).substr(2, 6).toUpperCase();
    exists = await this.findOne({ referralCode: code });
  }

  return code;
};

export default mongoose.model('Referral', referralSchema);
