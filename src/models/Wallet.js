import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  balance: {
    available: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
    locked: { type: Number, default: 0, min: 0 }
  },

  currency: {
    type: String,
    default: 'KES'
  },

  transactions: [{
    transactionId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'transfer', 'refund', 'commission', 'bonus', 'withdrawal'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balanceBefore: Number,
    balanceAfter: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending'
    },
    description: String,
    reference: String,
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['booking', 'payment', 'referral', 'subscription', 'withdrawal']
      },
      entityId: mongoose.Schema.Types.ObjectId
    },
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  withdrawals: [{
    withdrawalId: String,
    amount: Number,
    method: {
      type: String,
      enum: ['mpesa', 'bank']
    },
    destination: {
      mpesaNumber: String,
      bankAccount: {
        bankName: String,
        accountNumber: String,
        accountName: String
      }
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    requestedAt: Date,
    processedAt: Date,
    completedAt: Date,
    failureReason: String,
    transactionCode: String
  }],

  limits: {
    dailyWithdrawal: { type: Number, default: 100000 },
    dailyTransfer: { type: Number, default: 50000 },
    minimumWithdrawal: { type: Number, default: 100 }
  },

  statistics: {
    totalCredits: { type: Number, default: 0 },
    totalDebits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    successfulTransactions: { type: Number, default: 0 },
    failedTransactions: { type: Number, default: 0 }
  },

  security: {
    pin: {
      type: String,
      select: false
    },
    pinEnabled: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    lastPinChangeAt: Date
  },

  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended', 'closed'],
    default: 'active'
  },

  frozenReason: String,
  frozenAt: Date,
  frozenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// `user` and `transactions.transactionId` are already declared `unique: true` on the
// corresponding fields. Avoid re-declaring single-field indexes to prevent duplicate
// index warnings from Mongoose. Keep other useful indexes.
walletSchema.index({ status: 1 });
walletSchema.index({ 'transactions.timestamp': -1 });

walletSchema.virtual('totalBalance').get(function() {
  return this.balance.available + this.balance.pending + this.balance.locked;
});

walletSchema.methods.canWithdraw = function(amount) {
  if (this.status !== 'active') return { allowed: false, reason: 'Wallet not active' };
  if (amount > this.balance.available) return { allowed: false, reason: 'Insufficient balance' };
  if (amount < this.limits.minimumWithdrawal) return { allowed: false, reason: 'Below minimum withdrawal' };
  if (amount > this.limits.dailyWithdrawal) return { allowed: false, reason: 'Exceeds daily limit' };

  return { allowed: true };
};

walletSchema.methods.addTransaction = async function(transactionData) {
  const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const transaction = {
    transactionId,
    type: transactionData.type,
    amount: transactionData.amount,
    balanceBefore: this.balance.available,
    status: 'pending',
    description: transactionData.description,
    reference: transactionData.reference,
    relatedEntity: transactionData.relatedEntity,
    metadata: transactionData.metadata,
    timestamp: new Date()
  };

  if (transactionData.type === 'credit') {
    this.balance.available += transactionData.amount;
    this.statistics.totalCredits += transactionData.amount;
  } else if (transactionData.type === 'debit' || transactionData.type === 'withdrawal') {
    this.balance.available -= transactionData.amount;
    this.statistics.totalDebits += transactionData.amount;
  }

  transaction.balanceAfter = this.balance.available;
  transaction.status = 'completed';
  this.statistics.successfulTransactions += 1;

  this.transactions.push(transaction);
  await this.save();

  return transaction;
};

// Ensure newly added transactions always get a transactionId (defensive)
walletSchema.pre('save', function(next) {
  try {
    if (this.transactions && this.transactions.length) {
      this.transactions = this.transactions.map(tx => {
        if (!tx.transactionId) {
          tx.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        }
        return tx;
      });
    }
    next();
  } catch (err) {
    next(err);
  }
});

walletSchema.methods.requestWithdrawal = async function(amount, method, destination) {
  const canWithdraw = this.canWithdraw(amount);
  if (!canWithdraw.allowed) {
    throw new Error(canWithdraw.reason);
  }

  const withdrawalId = `WD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const withdrawal = {
    withdrawalId,
    amount,
    method,
    destination,
    status: 'pending',
    requestedAt: new Date()
  };

  this.balance.available -= amount;
  this.balance.locked += amount;

  this.withdrawals.push(withdrawal);
  await this.save();

  return withdrawal;
};

export default mongoose.model('Wallet', walletSchema);
