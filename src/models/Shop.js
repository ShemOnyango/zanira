import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Shop Information
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  shopType: {
    type: String,
    enum: ['plumbing_supplies', 'electrical_supplies', 'hardware', 'general'],
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },

  // Location Information
  location: {
    county: { type: String, required: true },
    town: { type: String, required: true },
    address: { type: String, required: true },
    building: String,
    floor: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    landmark: String
  },

  // Contact Information
  contactPhone: String,
  contactEmail: String,
  website: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String
  },

  // Business Information
  businessRegistrationNumber: String,
  businessPermit: String, // Cloudinary URL
  taxPin: String,
  yearsInOperation: Number,

  // Operating Hours
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
  },

  // Commission & Pricing
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  pricingTier: {
    type: String,
    enum: ['budget', 'standard', 'premium'],
    default: 'standard'
  },

  // Inventory & Catalog
  inventory: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: { type: Number, default: 0 },
    price: Number,
    sku: String
  }],
  catalog: [String], // Cloudinary URLs for catalog images

  // Verification Status
  verification: {
    documentsSubmitted: { type: Boolean, default: false },
    businessVerified: { type: Boolean, default: false },
    locationVerified: { type: Boolean, default: false },
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

  // Statistics
  stats: {
    totalTransactions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    fundiCustomers: { type: Number, default: 0 },
    clientCustomers: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 }
  },

  // Payment Information
  paymentMethods: [{
    type: String,
    enum: ['mpesa', 'bank', 'cash']
  }],
  mpesaPaybill: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  }
}, {
  timestamps: true
});

// Indexes
// `user` is unique on the schema; avoid duplicate index declaration
shopSchema.index({ shopType: 1 });
shopSchema.index({ 'location.county': 1, 'location.town': 1 });
shopSchema.index({ 'verification.overallStatus': 1 });
shopSchema.index({ pricingTier: 1 });

// Virtual for isOpen status
shopSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const day = now.toLocaleString('en', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.operatingHours[day];
  if (!todayHours || todayHours.closed) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
});

export default mongoose.model('Shop', shopSchema);