import mongoose from 'mongoose';

const fundiSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Professional Information
  profession: {
    type: String,
    enum: ['plumber', 'electrician', 'both'],
    required: true
  },
  specialization: [String],
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 50
  },
  bio: {
    type: String,
    maxlength: 1000
  },

  // Certifications & Qualifications
  certifications: [{
    name: String,
    issuingAuthority: String,
    certificateNumber: String,
    issueDate: Date,
    expiryDate: Date,
    document: String // Cloudinary URL
  }],
  ncaLicenseNumber: String,
  ncaCertificate: String, // Cloudinary URL
  otherLicenses: [{
    licenseType: String,
    licenseNumber: String,
    document: String
  }],

  // Skills & Services
  skills: [String],
  tools: [String],
  servicesOffered: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory'
    },
    basePrice: Number,
    description: String
  }],

  // Availability
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable', 'on_leave'],
    default: 'available'
  },
  workingHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '17:00' }
  },
  workingDays: [{
    type: String,
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  }],
  unavailableDates: [Date],

  // Location & Coverage
  operatingCounties: [String],
  operatingTowns: [String],
  maxDistance: { // Maximum distance willing to travel (km)
    type: Number,
    default: 50
  },

  // Professional Stats
  stats: {
    totalJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    ongoingJobs: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // in minutes
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalEarnings: { type: Number, default: 0 }
  },

  // Portfolio
  portfolio: [{
    title: String,
    description: String,
    beforeImage: String,
    afterImage: String,
    dateCompleted: Date,
    category: String
  }],

  // Financial Information
  paymentMethods: [{
    type: String,
    enum: ['mpesa', 'bank']
  }],
  mpesaNumber: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  earnings: {
    pending: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 }
  },

  // Verification Status
  verification: {
    videoVerified: { type: Boolean, default: false },
    toolsVerified: { type: Boolean, default: false },
    idVerified: { type: Boolean, default: false },
    ncaVerified: { type: Boolean, default: false },
    overallStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending'
    },
    verificationDate: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },

  // Preferences
  preferences: {
    jobNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    autoAcceptJobs: { type: Boolean, default: false },
    minimumJobValue: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
// `user` is unique on the schema; avoid duplicate index declaration
fundiSchema.index({ profession: 1 });
fundiSchema.index({ 'verification.overallStatus': 1 });
// Avoid creating a compound index across two array fields — MongoDB does not
// allow indexing parallel arrays and will throw "cannot index parallel arrays".
// Create separate single-field indexes instead.
fundiSchema.index({ operatingCounties: 1 });
fundiSchema.index({ operatingTowns: 1 });
fundiSchema.index({ 'stats.rating': -1 });
fundiSchema.index({ availability: 1 });

// Virtual for full verification status
fundiSchema.virtual('isFullyVerified').get(function() {
  return this.verification.overallStatus === 'verified';
});

// Virtual for response rate (to be calculated)
fundiSchema.virtual('responseRate').get(function() {
  if (this.stats.totalJobs === 0) return 100;
  return ((this.stats.completedJobs + this.stats.ongoingJobs) / this.stats.totalJobs) * 100;
});

// Pre-save middleware to update rating
fundiSchema.pre('save', function(next) {
  // This will be updated when reviews are implemented
  next();
});

export default mongoose.model('Fundi', fundiSchema);