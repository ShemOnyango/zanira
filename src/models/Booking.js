import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Booking Reference
  bookingId: {
    type: String,
    required: true,
    unique: true
  },

  // Job Information
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },

  // Parties Involved
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fundi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fundi'
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  // Service Details
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true
  },
  serviceDescription: String,
  customRequirements: String,

  // Pricing & Payment
  agreedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  pricingType: {
    type: String,
    enum: ['fixed', 'hourly', 'per_item'],
    default: 'fixed'
  },
  estimatedHours: Number,
  commissionRate: {
    type: Number,
    default: 10, // 10% platform commission
    min: 0,
    max: 100
  },
  platformFee: {
    type: Number,
    min: 0
  },
  fundiEarnings: {
    type: Number,
    min: 0
  },

  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: String,
  estimatedDuration: Number, // in minutes
  actualStartTime: Date,
  actualEndTime: Date,
  rescheduled: {
    count: { type: Number, default: 0 },
    history: [{
      oldDate: Date,
      newDate: Date,
      reason: String,
      requestedBy: String, // 'client' or 'fundi'
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
      },
      timestamp: Date
    }]
  },

  // Status & Workflow
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'scheduled',
      'in_progress',
      'completed',
      'cancelled',
      'disputed',
      'refunded'
    ],
    default: 'pending'
  },
  workflow: [{
    status: String,
    timestamp: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],

  // Materials & Tools
  materialsRequired: [{
    item: String,
    quantity: Number,
    estimatedCost: Number,
    providedBy: {
      type: String,
      enum: ['client', 'fundi', 'platform'],
      default: 'client'
    }
  }],
  toolsRequired: [String],

  // Location Information
  location: {
    county: String,
    town: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    landmark: String,
    instructions: String
  },

  // Communication
  chatThread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },

  // Payment & Escrow
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  escrowStatus: {
    type: String,
    enum: ['pending', 'funded', 'released', 'refunded', 'disputed'],
    default: 'pending'
  },

  // Completion & Review
  completion: {
    completedByFundi: { type: Boolean, default: false },
    completedByClient: { type: Boolean, default: false },
    completionDate: Date,
    clientNotes: String,
    fundiNotes: String,
    adminNotes: String,
    beforePhotos: [String],
    afterPhotos: [String]
  },

  // Rating & Review
  rating: {
    byClient: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      timestamp: Date
    },
    byFundi: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      timestamp: Date
    }
  },

  // Dispute Information
  dispute: {
    exists: { type: Boolean, default: false },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    description: String,
    resolution: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolvedAt: Date
  },

  // Metadata
  specialInstructions: String,
  emergencyContact: {
    name: String,
    phone: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total amount (agreedPrice if set, otherwise fallback to service basePrice if populated)
bookingSchema.virtual('totalAmount').get(function() {
  // Use agreedPrice when it's a valid number > 0
  const ap = this.agreedPrice;
  const agreed = (typeof ap === 'number') ? ap : (ap ? Number(ap) : NaN);
  if (Number.isFinite(agreed) && agreed > 0) return agreed;

  // If service is populated and has a basePrice, use it
  const svc = this.service;
  const svcBase = svc && (typeof svc.basePrice === 'number' ? svc.basePrice : (svc.basePrice ? Number(svc.basePrice) : NaN));
  if (Number.isFinite(svcBase) && svcBase > 0) return svcBase;

  // Default to 0
  return 0;
});

// Indexes
// `bookingId` is unique on the schema; avoid duplicate index declaration
bookingSchema.index({ client: 1 });
bookingSchema.index({ fundi: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ 'location.county': 1, 'location.town': 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for booking duration
bookingSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return (this.actualEndTime - this.actualStartTime) / (1000 * 60); // in minutes
  }
  return null;
});

// Virtual for isCompleted status
bookingSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for isActive status
bookingSchema.virtual('isActive').get(function() {
  return ['confirmed', 'scheduled', 'in_progress'].includes(this.status);
});

// Pre-validate middleware to generate booking ID so it exists before Mongoose runs required validation
bookingSchema.pre('validate', function(next) {
  if (this.isNew && !this.bookingId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingId = `ZB${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to calculate earnings and update workflow
bookingSchema.pre('save', function(next) {
  // Calculate platform fee and fundi earnings
  if (this.isModified('agreedPrice') || this.isModified('commissionRate')) {
    this.platformFee = (this.agreedPrice * this.commissionRate) / 100;
    this.fundiEarnings = this.agreedPrice - this.platformFee;
  }

  // Update workflow
  if (this.isModified('status')) {
    this.workflow.push({
      status: this.status,
      timestamp: new Date(),
      changedBy: this.fundi || this.client // This will be set properly in controllers
    });
  }

  next();
});

export default mongoose.model('Booking', bookingSchema);