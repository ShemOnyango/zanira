import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  // Invoice Identification
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceType: {
    type: String,
    enum: ['booking', 'subscription', 'penalty', 'refund', 'service_fee', 'custom'],
    required: true
  },

  // Related Entities
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fundi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fundi'
  },
  dispute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },

  // Invoice Details
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  paymentTerms: {
    type: String,
    enum: ['upon_receipt', 'net_7', 'net_15', 'net_30', 'custom'],
    default: 'upon_receipt'
  },

  // Line Items
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    taxRate: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    category: String,
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  discount: {
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    reason: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: function() { return this.totalAmount; }
  },
  currency: {
    type: String,
    default: 'KES'
  },

  // Payment Information
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentMethod: String,
  paymentDate: Date,
  paymentReference: String,

  // Tax Information
  tax: {
    vatNumber: String,
    taxRates: [{
      name: String,
      rate: Number,
      amount: Number
    }]
  },

  // Client & Fundi Information
  billingInfo: {
    client: {
      name: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        county: String,
        postalCode: String,
        country: { type: String, default: 'Kenya' }
      }
    },
    fundi: {
      name: String,
      email: String,
      phone: String,
      businessNumber: String,
      address: {
        street: String,
        city: String,
        county: String,
        postalCode: String,
        country: { type: String, default: 'Kenya' }
      }
    }
  },

  // Platform Information
  platformInfo: {
    companyName: { type: String, default: 'Zanira BuildLink' },
    address: {
      street: { type: String, default: 'Nairobi, Kenya' },
      city: { type: String, default: 'Nairobi' },
      county: { type: String, default: 'Nairobi' },
      country: { type: String, default: 'Kenya' }
    },
    phone: { type: String, default: '+254 700 000 000' },
    email: { type: String, default: 'billing@zanirabuildlink.com' },
    website: { type: String, default: 'https://zanirabuildlink.com' },
    taxNumber: String
  },

  // Notes & Terms
  notes: {
    internal: String,
    client: String,
    terms: {
      type: String,
      default: 'Payment due upon receipt. Late payments may be subject to fees.'
    }
  },

  // Delivery & Tracking
  delivery: {
    sentAt: Date,
    sentVia: {
      type: String,
      enum: ['email', 'sms', 'both', 'manual']
    },
    emailStatus: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      opened: { type: Boolean, default: false },
      error: String
    },
    downloadCount: { type: Number, default: 0 }
  },

  // History
  history: [{
    action: String,
    description: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: mongoose.Schema.Types.Mixed
  }],

  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
// `invoiceNumber` is unique on the schema; avoid duplicate index declaration
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ fundi: 1 });
invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ issueDate: -1 });

// Virtual for isOverdue
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status === 'issued' && new Date() > this.dueDate;
});

// Virtual for daysOverdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  // Generate invoice number
  if (this.isNew) {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.invoiceNumber = `INV-${year}${month}-${sequence}`;
  }

  // Calculate due date based on payment terms
  if (this.isModified('paymentTerms') || this.isNew) {
    const dueDate = new Date(this.issueDate);
    
    switch (this.paymentTerms) {
      case 'net_7':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'net_15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'net_30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'upon_receipt':
      default:
        dueDate.setDate(dueDate.getDate() + 0);
    }
    
    this.dueDate = dueDate;
  }

  // Calculate totals
  if (this.isModified('items') || this.isNew) {
    this.calculateTotals();
  }

  // Update balance due
  if (this.isModified('totalAmount') || this.isModified('amountPaid')) {
    this.balanceDue = this.totalAmount - this.amountPaid;
    
    // Update status based on payment
    if (this.balanceDue <= 0 && this.totalAmount > 0) {
      this.status = 'paid';
      this.paymentDate = new Date();
    } else if (this.amountPaid > 0) {
      this.status = 'issued';
    }
  }

  // Add to history for significant changes
  if (this.isModified('status') && !this.isNew) {
    this.history.push({
      action: 'status_change',
      description: `Status changed from ${this.previous('status')} to ${this.status}`,
      performedBy: this.modifiedPaths().includes('status') ? this._updatedBy : null
    });
  }

  next();
});

// Method to calculate invoice totals
invoiceSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let taxTotal = 0;

  this.items.forEach(item => {
    // Calculate item amount if not provided
    if (!item.amount) {
      item.amount = item.quantity * item.unitPrice;
    }
    
    subtotal += item.amount;
    
    // Calculate tax if not provided
    if (item.taxRate > 0 && !item.taxAmount) {
      item.taxAmount = item.amount * (item.taxRate / 100);
    }
    
    taxTotal += item.taxAmount || 0;
  });

  // Apply discount
  let discountAmount = 0;
  if (this.discount.percentage > 0) {
    discountAmount = subtotal * (this.discount.percentage / 100);
  } else if (this.discount.amount > 0) {
    discountAmount = this.discount.amount;
  }

  this.subtotal = subtotal;
  this.taxTotal = taxTotal;
  this.totalAmount = subtotal + taxTotal - discountAmount;
  this.balanceDue = this.totalAmount - this.amountPaid;
};

// Method to add payment
invoiceSchema.methods.addPayment = function(amount, paymentMethod, reference, paymentId) {
  this.amountPaid += amount;
  this.balanceDue = this.totalAmount - this.amountPaid;
  this.paymentMethod = paymentMethod;
  this.paymentReference = reference;
  this.payment = paymentId;

  if (this.balanceDue <= 0) {
    this.status = 'paid';
    this.paymentDate = new Date();
  } else {
    this.status = 'issued';
  }

  this.history.push({
    action: 'payment_received',
    description: `Payment of ${this.currency} ${amount} received via ${paymentMethod}`,
    performedBy: null // System action
  });

  return this.save();
};

// Method to generate PDF (placeholder for actual PDF generation)
invoiceSchema.methods.generatePDF = async function() {
  // In production, this would use a library like pdfkit, puppeteer, or a service
  // For now, return a URL placeholder
  return `https://zanirabuildlink.com/invoices/${this.invoiceNumber}.pdf`;
};

// Static method to find overdue invoices
invoiceSchema.statics.findOverdueInvoices = function() {
  return this.find({
    status: 'issued',
    dueDate: { $lt: new Date() }
  });
};

// Static method to get invoice statistics
invoiceSchema.statics.getInvoiceStats = async function(period = '30d') {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const stats = await this.aggregate([
    {
      $match: {
        issueDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$amountPaid' }
      }
    }
  ]);

  const revenueStats = await this.aggregate([
    {
      $match: {
        status: 'paid',
        paymentDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' },
          day: { $dayOfMonth: '$paymentDate' }
        },
        dailyRevenue: { $sum: '$amountPaid' },
        invoiceCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  return {
    byStatus: stats,
    revenueTrend: revenueStats,
    period
  };
};

export default mongoose.model('Invoice', invoiceSchema);