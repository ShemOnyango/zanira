import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Client Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'sw'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['mpesa', 'card', 'bank'],
      default: 'mpesa'
    }
  },

  // Client Statistics
  stats: {
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now }
  },

  // Loyalty Program
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },

  // Emergency Contacts
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String
  }],

  // Verification
  idDocument: {
    type: String, // Cloudinary URL
    select: false
  },
  idVerified: {
    type: Boolean,
    default: false
  },

  // Security
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    lastUsed: Date,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes
// `user` is unique on the schema; avoid duplicate index declaration
clientSchema.index({ 'stats.totalSpent': -1 });
clientSchema.index({ loyaltyTier: 1 });

// Virtual populate for bookings
clientSchema.virtual('bookings', {
  ref: 'Booking',
  localField: 'user',
  foreignField: 'client'
});

// Pre-save middleware to update loyalty tier
clientSchema.pre('save', function(next) {
  const totalSpent = this.stats.totalSpent;
  
  if (totalSpent >= 100000) this.loyaltyTier = 'platinum';
  else if (totalSpent >= 50000) this.loyaltyTier = 'gold';
  else if (totalSpent >= 20000) this.loyaltyTier = 'silver';
  else this.loyaltyTier = 'bronze';
  
  next();
});

export default mongoose.model('Client', clientSchema);