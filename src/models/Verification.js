import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  // Applicant Information
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantType: {
    type: String,
    enum: ['fundi', 'client', 'shop'],
    required: true
  },

  // Document Submissions
  documents: {
    // For Fundi Verification
    video: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    photoWithTools: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    nationalIdFront: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    nationalIdBack: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    ncaCertificate: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    otherCertificates: [{
      name: String,
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    }],

    // For Client Verification
    clientIdDocument: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },

    // For Shop Verification
    businessRegistration: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    businessPermit: {
      url: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    },
    shopPhotos: [{
      url: String,
      description: String,
      uploadedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      adminNotes: String
    }]
  },

  // Verification Process
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'additional_info_required'],
    default: 'draft'
  },
  submissionDate: Date,
  reviewDate: Date,
  completionDate: Date,

  // Admin Assignment & Review
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewerNotes: String,
  rejectionReason: String,

  // Additional Information Request
  additionalInfoRequested: {
    requested: { type: Boolean, default: false },
    message: String,
    requestedAt: Date,
    responded: { type: Boolean, default: false },
    responseDate: Date
  },

  // Security
  verificationCode: String, // For phone/email verification
  codeExpires: Date
}, {
  timestamps: true
});

// Indexes
verificationSchema.index({ applicant: 1 });
verificationSchema.index({ applicantType: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ assignedTo: 1 });
verificationSchema.index({ createdAt: -1 });

// Virtual for overall progress
verificationSchema.virtual('progress').get(function() {
  const totalDocuments = Object.values(this.documents).filter(doc => doc && doc.url).length;
  const approvedDocuments = Object.values(this.documents).filter(doc => doc && doc.status === 'approved').length;
  
  if (totalDocuments === 0) return 0;
  return (approvedDocuments / totalDocuments) * 100;
});

// Pre-save middleware to update status based on document approvals
verificationSchema.pre('save', function(next) {
  if (this.isModified('documents')) {
    const documents = Object.values(this.documents).filter(doc => doc && doc.url);
    const approvedCount = documents.filter(doc => doc.status === 'approved').length;
    const rejectedCount = documents.filter(doc => doc.status === 'rejected').length;
    
    if (approvedCount === documents.length && documents.length > 0) {
      this.status = 'approved';
    } else if (rejectedCount > 0) {
      this.status = 'rejected';
    } else if (documents.length > 0) {
      this.status = 'under_review';
    }
  }
  next();
});

export default mongoose.model('Verification', verificationSchema);