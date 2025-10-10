import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Payment Reference
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  reference: {
    type: String,
    required: true
  },

  // Booking Information
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
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
    ref: 'Fundi',
    required: true
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES'
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'bank', 'cash'],
    required: true
  },
  paymentType: {
    type: String,
    enum: ['deposit', 'full', 'balance', 'refund'],
    default: 'full'
  },

  // M-Pesa Specific Fields
  mpesa: {
    phoneNumber: String,
    transactionCode: String,
    merchantRequestID: String,
    checkoutRequestID: String,
    resultCode: String,
    resultDesc: String,
    receiptNumber: String
  },

  // Card Payment Specific Fields
  card: {
    cardType: String,
    last4: String,
    authorizationCode: String
  },

  // Bank Transfer Specific Fields
  bank: {
    bankName: String,
    accountNumber: String,
    transactionReference: String
  },

  // Escrow Management
  escrowStatus: {
    type: String,
    enum: ['pending', 'held', 'released', 'refunded', 'disputed'],
    default: 'pending'
  },
  escrowTransactions: [{
    type: {
      type: String,
      enum: ['deposit', 'release', 'refund', 'commission']
    },
    amount: Number,
    timestamp: Date,
    reference: String,
    description: String
  }],

  // Commission & Fees
  commission: {
    rate: { type: Number, default: 10 },
    amount: { type: Number, default: 0 }
  },
  platformFee: {
    type: Number,
    default: 0
  },
  fundiAmount: {
    type: Number,
    default: 0
  },
  shopCommission: {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    },
    amount: Number,
    rate: Number
  },

  // Payment Status
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'disputed'
    ],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    reason: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Timeline
  initiatedAt: Date,
  processedAt: Date,
  completedAt: Date,
  refundedAt: Date,

  // Security & Verification
  verification: {
    verified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    verifiedAt: Date,
    verificationMethod: String
  },

  // Error Handling
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },

  // Metadata
  description: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
// `paymentId` is unique on the schema; avoid duplicate index declaration
paymentSchema.index({ reference: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ fundi: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'mpesa.transactionCode': 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for isSuccessful status
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed';
});

// Virtual for isRefundable status
paymentSchema.virtual('isRefundable').get(function() {
  return this.status === 'completed' && 
         this.escrowStatus !== 'refunded' && 
         this.escrowStatus !== 'disputed';
});

// Pre-save middleware to generate payment ID and update amounts
paymentSchema.pre('save', function(next) {
  // Generate unique payment ID
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.paymentId = `ZP${timestamp}${random}`;
    this.reference = `ZANIRA-${timestamp}${random}`;
  }

  // Calculate commission and fundi amount
  if (this.isModified('amount') || this.isModified('commission.rate')) {
    this.commission.amount = (this.amount * this.commission.rate) / 100;
    this.platformFee = this.commission.amount;
    this.fundiAmount = this.amount - this.platformFee;
  }

  // Update status history
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      reason: this.error ? this.error.message : 'Status updated',
      updatedBy: this.client // This will be set properly in controllers
    });
  }

  // Update timeline based on status
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'processing':
        this.initiatedAt = this.initiatedAt || now;
        break;
      case 'completed':
        this.completedAt = now;
        break;
      case 'refunded':
        this.refundedAt = now;
        break;
    }
  }

  next();
});

export default mongoose.model('Payment', paymentSchema);