import mongoose from 'mongoose';

const escrowAccountSchema = new mongoose.Schema({
  // Account Identification
  accountNumber: {
    type: String,
    required: true,
    unique: true
  },
  accountName: {
    type: String,
    required: true,
    default: 'Zanira BuildLink Escrow Account'
  },

  // Balance Tracking
  balances: {
    totalHeld: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    inDispute: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 }
  },

  // Security
  security: {
    encryptionKey: { type: String, select: false },
    lastAudit: Date,
    auditLog: [{
      timestamp: Date,
      action: String,
      amount: Number,
      previousBalance: Number,
      newBalance: Number,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },

  // Bank Account Details (for transfers)
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    branchCode: String,
    currency: { type: String, default: 'KES' }
  },

  // M-Pesa Details
  mpesaDetails: {
    paybillNumber: String,
    tillNumber: String,
    businessName: String
  },

  // Settings
  settings: {
    autoReleaseDays: { type: Number, default: 1 }, // Auto-release after 1 day of completion
    disputeHoldDays: { type: Number, default: 7 }, // Hold disputed funds for 7 days
    maxSingleTransaction: { type: Number, default: 500000 }, // 500,000 KES
    dailyTransactionLimit: { type: Number, default: 1000000 }, // 1,000,000 KES
    requireAdminApproval: { type: Boolean, default: true } // For large transactions
  },

  // Statistics
  statistics: {
    totalTransactions: { type: Number, default: 0 },
    successfulReleases: { type: Number, default: 0 },
    disputes: { type: Number, default: 0 },
    averageHoldTime: { type: Number, default: 0 }, // in hours
    failureRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
// `accountNumber` is unique on the schema; avoid duplicate index declaration
escrowAccountSchema.index({ 'balances.totalHeld': -1 });

// Pre-save middleware to generate account number
escrowAccountSchema.pre('save', function(next) {
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.accountNumber = `ESC${timestamp}${random}`;
  }
  next();
});

// Method to add audit log
escrowAccountSchema.methods.addAuditLog = function(action, amount, performedBy, notes = '') {
  const previousBalance = this.balances.available;
  let newBalance = previousBalance;

  // Update balance based on action
  switch (action) {
    case 'deposit':
    case 'fund_release':
      newBalance = previousBalance + amount;
      break;
    case 'withdrawal':
    case 'refund':
      newBalance = previousBalance - amount;
      break;
    case 'hold_dispute':
      this.balances.inDispute += amount;
      this.balances.available -= amount;
      break;
    case 'resolve_dispute':
      this.balances.inDispute -= amount;
      this.balances.available += amount;
      break;
  }

  this.security.auditLog.push({
    timestamp: new Date(),
    action,
    amount,
    previousBalance,
    newBalance,
    performedBy,
    notes
  });

  // Update security timestamp
  this.security.lastAudit = new Date();

  return this.save();
};

// Static method to get main escrow account
escrowAccountSchema.statics.getMainAccount = async function() {
  let account = await this.findOne();
  
  if (!account) {
    account = await this.create({});
  }
  
  return account;
};

export default mongoose.model('EscrowAccount', escrowAccountSchema);