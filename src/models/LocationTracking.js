import mongoose from 'mongoose';

const locationTrackingSchema = new mongoose.Schema({
  // Tracking Session
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  fundi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fundi',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Location Data
  locations: [{
    timestamp: { type: Date, default: Date.now },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: Number, // in meters
      altitude: Number,
      altitudeAccuracy: Number,
      heading: Number, // direction in degrees
      speed: Number // in m/s
    },
    address: {
      street: String,
      city: String,
      county: String,
      country: { type: String, default: 'Kenya' },
      postalCode: String,
      formattedAddress: String
    },
    batteryLevel: Number, // percentage
    networkType: String, // wifi, cellular, etc.
    isCharging: Boolean,
    appState: {
      type: String,
      enum: ['active', 'background', 'inactive'],
      default: 'active'
    }
  }],

  // Session Information
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  lastUpdated: Date,

  // Settings & Permissions
  settings: {
    updateInterval: { type: Number, default: 30 }, // seconds
    maxDuration: { type: Number, default: 14400 }, // 4 hours in seconds
    autoEndOnArrival: { type: Boolean, default: true },
    clientCanView: { type: Boolean, default: true },
    sharePreciseLocation: { type: Boolean, default: true }
  },

  // Privacy & Security
  privacy: {
    locationMasking: { type: Boolean, default: false }, // Show approximate location only
    dataRetentionDays: { type: Number, default: 30 }, // Auto-delete after 30 days
    encryptedData: { type: Boolean, default: true }
  },

  // Performance Metrics
  metrics: {
    totalUpdates: { type: Number, default: 0 },
    averageAccuracy: Number,
    totalDistance: Number, // in meters
    averageSpeed: Number, // in m/s
    batteryConsumption: Number, // percentage
    dataUsage: Number // in KB
  },

  // Geofencing
  geofence: {
    jobLocation: {
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      radius: { type: Number, default: 100 } // meters
    },
    arrivalDetected: { type: Boolean, default: false },
    arrivalTime: Date,
    departureDetected: { type: Boolean, default: false },
    departureTime: Date
  },

  // Notifications
  notifications: {
    arrivalSent: { type: Boolean, default: false },
    delayedSent: { type: Boolean, default: false },
    offRouteSent: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for performance
// `sessionId` is unique on the schema; avoid duplicate index declaration
locationTrackingSchema.index({ booking: 1 });
locationTrackingSchema.index({ fundi: 1 });
locationTrackingSchema.index({ client: 1 });
locationTrackingSchema.index({ status: 1 });
locationTrackingSchema.index({ 'locations.timestamp': -1 });
locationTrackingSchema.index({ lastUpdated: -1 });

// Compound index for geospatial queries
locationTrackingSchema.index({ 'locations.coordinates': '2dsphere' });

// Virtual for current location
locationTrackingSchema.virtual('currentLocation').get(function() {
  if (this.locations.length === 0) return null;
  return this.locations[this.locations.length - 1];
});

// Virtual for session duration
locationTrackingSchema.virtual('duration').get(function() {
  const end = this.endedAt || new Date();
  return (end - this.startedAt) / 1000; // in seconds
});

// Virtual for ETA (Estimated Time of Arrival)
locationTrackingSchema.virtual('eta').get(function() {
  if (!this.currentLocation || !this.geofence.jobLocation.coordinates) return null;

  const currentLoc = this.currentLocation.coordinates;
  const jobLoc = this.geofence.jobLocation.coordinates;
  
  // Calculate distance using Haversine formula
  const distance = this.calculateDistance(currentLoc, jobLoc);
  const averageSpeed = this.metrics.averageSpeed || 5; // default 5 m/s (~18 km/h)
  
  if (averageSpeed <= 0) return null;
  
  return distance / averageSpeed; // in seconds
});

// Pre-save middleware
locationTrackingSchema.pre('save', function(next) {
  // Generate session ID
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.sessionId = `LOC${timestamp}${random}`;
  }

  // Update lastUpdated timestamp
  if (this.isModified('locations') && this.locations.length > 0) {
    this.lastUpdated = new Date();
    this.metrics.totalUpdates = this.locations.length;
  }

  // Check for arrival
  if (this.settings.autoEndOnArrival && this.geofence.arrivalDetected && !this.endedAt) {
    this.status = 'completed';
    this.endedAt = new Date();
  }

  // Check session expiration
  if (this.status === 'active' && this.duration > this.settings.maxDuration) {
    this.status = 'expired';
    this.endedAt = new Date();
  }

  next();
});

// Method to add location update
locationTrackingSchema.methods.addLocationUpdate = function(locationData) {
  this.locations.push(locationData);
  
  // Update metrics
  this.updateMetrics();
  
  // Check geofence
  this.checkGeofence(locationData.coordinates);
  
  return this.save();
};

// Method to update performance metrics
locationTrackingSchema.methods.updateMetrics = function() {
  if (this.locations.length < 2) return;

  const locations = this.locations;
  
  // Calculate total distance
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1].coordinates;
    const curr = locations[i].coordinates;
    totalDistance += this.calculateDistance(prev, curr);
  }
  this.metrics.totalDistance = totalDistance;

  // Calculate average speed
  const duration = (locations[locations.length - 1].timestamp - locations[0].timestamp) / 1000;
  this.metrics.averageSpeed = duration > 0 ? totalDistance / duration : 0;

  // Calculate average accuracy
  const totalAccuracy = locations.reduce((sum, loc) => sum + (loc.coordinates.accuracy || 0), 0);
  this.metrics.averageAccuracy = totalAccuracy / locations.length;
};

// Method to check geofence
locationTrackingSchema.methods.checkGeofence = function(currentCoordinates) {
  if (!this.geofence.jobLocation.coordinates) return;

  const distance = this.calculateDistance(currentCoordinates, this.geofence.jobLocation.coordinates);
  const radius = this.geofence.jobLocation.radius;

  // Check arrival
  if (!this.geofence.arrivalDetected && distance <= radius) {
    this.geofence.arrivalDetected = true;
    this.geofence.arrivalTime = new Date();
    
    // Auto-end session if enabled
    if (this.settings.autoEndOnArrival) {
      this.status = 'completed';
      this.endedAt = new Date();
    }
  }

  // Check departure (if already arrived)
  if (this.geofence.arrivalDetected && !this.geofence.departureDetected && distance > radius) {
    this.geofence.departureDetected = true;
    this.geofence.departureTime = new Date();
  }
};

// Calculate distance between two coordinates (Haversine formula)
locationTrackingSchema.methods.calculateDistance = function(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
  const dLon = this.deg2rad(coord2.longitude - coord1.longitude);

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

locationTrackingSchema.methods.deg2rad = function(deg) {
  return deg * (Math.PI/180);
};

// Method to get location history within time range
locationTrackingSchema.methods.getLocationHistory = function(startTime, endTime) {
  return this.locations.filter(loc => {
    const locTime = new Date(loc.timestamp);
    return locTime >= startTime && locTime <= endTime;
  });
};

// Static method to cleanup old location data
locationTrackingSchema.statics.cleanupOldData = async function(retentionDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    endedAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'cancelled', 'expired'] }
  });

  return result.deletedCount;
};

export default mongoose.model('LocationTracking', locationTrackingSchema);