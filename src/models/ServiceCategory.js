import mongoose from 'mongoose';

const serviceCategorySchema = new mongoose.Schema({
  // Category Information
  name: {
    type: String,
    required: [true, 'Service name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'both'],
    required: true
  },
  icon: String,
  image: String,

  // Pricing Information
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  priceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  pricingType: {
    type: String,
    enum: ['fixed', 'hourly', 'per_item', 'negotiable'],
    default: 'fixed'
  },
  currency: {
    type: String,
    default: 'KES'
  },

  // Service Details
  duration: {
    estimated: Number, // in minutes
    min: Number,
    max: Number
  },
  complexity: {
    type: String,
    enum: ['simple', 'moderate', 'complex', 'expert'],
    default: 'moderate'
  },
  toolsRequired: [String],
  materialsRequired: [String],
  safetyRequirements: [String],

  // Service Requirements
  qualifications: [String],
  certifications: [String],
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    default: 'intermediate'
  },

  // Service Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isEmergency: {
    type: Boolean,
    default: false
  },

  // Statistics
  stats: {
    totalBookings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    completionRate: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 } // in minutes
  },

  // Metadata
  tags: [String],
  searchKeywords: [String],
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
// `name` is unique on the schema; avoid duplicate index declaration
serviceCategorySchema.index({ category: 1 });
serviceCategorySchema.index({ isActive: 1 });
serviceCategorySchema.index({ isPopular: 1 });
serviceCategorySchema.index({ isEmergency: 1 });
serviceCategorySchema.index({ 'stats.averageRating': -1 });

// Pre-save middleware to ensure priceRange min/max are consistent
serviceCategorySchema.pre('save', function(next) {
  if (this.priceRange.min > this.priceRange.max) {
    [this.priceRange.min, this.priceRange.max] = [this.priceRange.max, this.priceRange.min];
  }
  next();
});

export default mongoose.model('ServiceCategory', serviceCategorySchema);