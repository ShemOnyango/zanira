import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // Job Information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  serviceCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['plumbing', 'electrical'],
    required: true
  },

  // Client Information
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Location Information
  location: {
    county: { type: String, required: true },
    town: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    landmark: String,
    instructions: String
  },

  // Job Details
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'commercial'],
    default: 'medium'
  },

  // Scheduling
  preferredDate: Date,
  preferredTime: String,
  flexibleTiming: {
    type: Boolean,
    default: false
  },

  // Budget & Pricing
  budget: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'KES' }
  },
  pricingType: {
    type: String,
    enum: ['fixed', 'hourly', 'quote'],
    default: 'quote'
  },

  // Job Requirements
  skillsRequired: [String],
  toolsRequired: [String],
  materialsRequired: [String],
  specialRequirements: String,

  // Status & Timeline
  status: {
    type: String,
    enum: [
      'draft',
      'posted',
      'bidding',
      'assigned',
      'scheduled',
      'in_progress',
      'completed',
      'cancelled',
      'disputed'
    ],
    default: 'draft'
  },
  timeline: {
    posted: Date,
    biddingEnds: Date,
    assigned: Date,
    scheduled: Date,
    started: Date,
    completed: Date,
    cancelled: Date
  },

  // Assignment Information
  assignedFundi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fundi'
  },
  assignedBy: { // Admin who assigned the job
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assignmentMethod: {
    type: String,
    enum: ['auto', 'manual', 'bid'],
    default: 'manual'
  },

  // Bidding System (Future Feature)
  bids: [{
    fundi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fundi'
    },
    amount: Number,
    proposal: String,
    timeline: Number, // in days
    submittedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],

  // Job Media
  photos: [{
    url: String,
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date
  }],
  documents: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date
  }],

  // Metadata
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
jobSchema.index({ client: 1 });
jobSchema.index({ serviceType: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ 'location.county': 1, 'location.town': 1 });
jobSchema.index({ urgency: 1 });
jobSchema.index({ assignedFundi: 1 });
jobSchema.index({ createdAt: -1 });

// Virtual for job duration
jobSchema.virtual('duration').get(function() {
  if (this.timeline.started && this.timeline.completed) {
    return this.timeline.completed - this.timeline.started;
  }
  return null;
});

// Virtual for isActive status
jobSchema.virtual('isActive').get(function() {
  return ['posted', 'bidding', 'assigned', 'scheduled', 'in_progress'].includes(this.status);
});

// Pre-save middleware to update timeline
jobSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'posted':
        this.timeline.posted = now;
        break;
      case 'assigned':
        this.timeline.assigned = now;
        break;
      case 'in_progress':
        this.timeline.started = now;
        break;
      case 'completed':
        this.timeline.completed = now;
        break;
      case 'cancelled':
        this.timeline.cancelled = now;
        break;
    }
  }
  next();
});

export default mongoose.model('Job', jobSchema);