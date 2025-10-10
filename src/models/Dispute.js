import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  // Dispute Identification
  disputeId: {
    type: String,
    required: true,
    unique: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },

  // Parties Involved
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  raisedAgainst: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  raisedByRole: {
    type: String,
    enum: ['client', 'fundi'],
    required: true
  },

  // Dispute Details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'poor_workmanship',
      'late_arrival',
      'no_show',
      'damaged_property',
      'safety_violation',
      'over_charging',
      'unprofessional_conduct',
      'incomplete_work',
      'miscommunication',
      'payment_issue',
      'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Evidence
  evidence: {
    photos: [String], // Cloudinary URLs
    videos: [String], // Cloudinary URLs
    documents: [String], // Cloudinary URLs
    witnessStatements: [{
      name: String,
      contact: String,
      statement: String
    }],
    additionalNotes: String
  },

  // Resolution & Penalties
  status: {
    type: String,
    enum: [
      'raised',
      'under_review',
      'additional_info_required',
      'resolved',
      'escalated',
      'cancelled'
    ],
    default: 'raised'
  },
  resolution: {
    decision: {
      type: String,
      enum: [
        'client_favor',
        'fundi_favor',
        'partial_client_favor',
        'partial_fundi_favor',
        'mutual_agreement',
        'dismissed'
      ]
    },
    decisionDate: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolutionNotes: String,
    adminNotes: String
  },

  // Financial Penalties & Adjustments
  penalties: {
    clientPenalty: {
      amount: { type: Number, default: 0 },
      reason: String,
      type: {
        type: String,
        enum: ['full_refund', 'partial_refund', 'service_credit', 'account_suspension']
      }
    },
    fundiPenalty: {
      amount: { type: Number, default: 0 },
      reason: String,
      type: {
        type: String,
        enum: [
          'payment_deduction',
          'payment_forfeiture',
          'rating_penalty',
          'account_suspension',
          'training_required'
        ]
      }
    },
    platformActions: {
      refundAmount: { type: Number, default: 0 },
      compensationAmount: { type: Number, default: 0 },
      commissionAdjustment: { type: Number, default: 0 },
      notes: String
    }
  },

  // Timeline
  timeline: {
    raisedAt: { type: Date, default: Date.now },
    acknowledgedAt: Date,
    underReviewAt: Date,
    resolvedAt: Date,
    escalatedAt: Date
  },

  // Admin Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Communication
  chatThread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  internalNotes: [{
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],

  // Escalation
  escalation: {
    escalated: { type: Boolean, default: false },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    escalationReason: String,
    escalationLevel: {
      type: String,
      enum: ['level_1', 'level_2', 'senior_management'],
      default: 'level_1'
    }
  },

  // Satisfaction & Follow-up
  satisfaction: {
    clientSatisfaction: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      providedAt: Date
    },
    fundiSatisfaction: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      providedAt: Date
    }
  }
}, {
  timestamps: true
});

// Indexes
// `disputeId` is unique on the schema; avoid duplicate index declaration
disputeSchema.index({ booking: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ raisedAgainst: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ priority: 1 });
disputeSchema.index({ 'timeline.raisedAt': -1 });
disputeSchema.index({ category: 1 });
disputeSchema.index({ assignedTo: 1 });

// Virtual for isActive
disputeSchema.virtual('isActive').get(function() {
  return ['raised', 'under_review', 'additional_info_required'].includes(this.status);
});

// Virtual for total penalty amount
disputeSchema.virtual('totalPenaltyAmount').get(function() {
  return (this.penalties.clientPenalty.amount || 0) + 
         (this.penalties.fundiPenalty.amount || 0) +
         (this.penalties.platformActions.refundAmount || 0) +
         (this.penalties.platformActions.compensationAmount || 0);
});

// Pre-save middleware to generate dispute ID
disputeSchema.pre('save', function(next) {
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.disputeId = `DSP${timestamp}${random}`;
  }
  next();
});

// Method to calculate automatic penalties based on severity and category
disputeSchema.methods.calculateAutomaticPenalties = function() {
  const penaltyMatrix = {
    poor_workmanship: { low: 500, medium: 1000, high: 2000, critical: 5000 },
    late_arrival: { low: 200, medium: 500, high: 1000, critical: 2000 },
    no_show: { low: 500, medium: 1000, high: 2000, critical: 5000 },
    damaged_property: { low: 1000, medium: 5000, high: 10000, critical: 25000 },
    safety_violation: { low: 1000, medium: 2500, high: 5000, critical: 10000 },
    over_charging: { low: 500, medium: 1000, high: 2000, critical: 5000 },
    unprofessional_conduct: { low: 500, medium: 1000, high: 2000, critical: 5000 },
    incomplete_work: { low: 500, medium: 1000, high: 2000, critical: 5000 }
  };

  const basePenalty = penaltyMatrix[this.category]?.[this.severity] || 0;
  
  if (this.raisedByRole === 'client' && basePenalty > 0) {
    this.penalties.fundiPenalty.amount = basePenalty;
    this.penalties.fundiPenalty.type = 'payment_deduction';
    this.penalties.fundiPenalty.reason = `Automatic penalty for ${this.category} (${this.severity} severity)`;
  }

  return basePenalty;
};

// Method to escalate dispute
disputeSchema.methods.escalateDispute = function(adminId, reason, level = 'level_2') {
  this.escalation.escalated = true;
  this.escalation.escalatedBy = adminId;
  this.escalation.escalationReason = reason;
  this.escalation.escalationLevel = level;
  this.timeline.escalatedAt = new Date();
  this.priority = 'high';
  
  return this.save();
};

// Static method to get dispute statistics
disputeSchema.statics.getDisputeStats = async function(period = '30d') {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPenalties: { $sum: '$totalPenaltyAmount' }
      }
    }
  ]);

  const categoryStats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return {
    byStatus: stats,
    byCategory: categoryStats,
    period
  };
};

export default mongoose.model('Dispute', disputeSchema);