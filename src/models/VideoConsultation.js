import mongoose from 'mongoose';

const videoConsultationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },

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

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },

  type: {
    type: String,
    enum: ['pre_booking', 'consultation', 'support', 'inspection'],
    default: 'consultation'
  },

  provider: {
    type: String,
    enum: ['twilio', 'agora', 'jitsi'],
    default: 'twilio'
  },

  roomDetails: {
    roomName: String,
    roomSid: String,
    token: String,
    agoraChannelName: String,
    agoraAppId: String
  },

  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['host', 'participant', 'observer']
    },
    joinedAt: Date,
    leftAt: Date,
    duration: Number,
    connectionQuality: String
  }],

  scheduling: {
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,
    duration: Number,
    timezone: String
  },

  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled', 'missed', 'failed'],
    default: 'scheduled'
  },

  recording: {
    enabled: { type: Boolean, default: false },
    recordingSid: String,
    recordingUrl: String,
    recordingDuration: Number,
    recordingSize: Number
  },

  notes: {
    clientNotes: String,
    fundiNotes: String,
    adminNotes: String
  },

  quality: {
    averageConnectionQuality: String,
    videoQuality: String,
    audioQuality: String,
    networkIssues: [{
      type: String,
      timestamp: Date
    }]
  },

  cost: {
    amount: Number,
    currency: { type: String, default: 'KES' },
    chargedTo: {
      type: String,
      enum: ['client', 'fundi', 'platform', 'free']
    }
  },

  feedback: {
    clientRating: { type: Number, min: 1, max: 5 },
    clientComment: String,
    fundiRating: { type: Number, min: 1, max: 5 },
    fundiComment: String,
    technicalIssues: Boolean,
    wouldRecommend: Boolean
  },

  metadata: mongoose.Schema.Types.Mixed,

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  cancelledAt: Date
}, {
  timestamps: true
});

videoConsultationSchema.index({ client: 1 });
videoConsultationSchema.index({ fundi: 1 });
// `sessionId` is unique on the schema - do not re-declare a single-field index here.
videoConsultationSchema.index({ status: 1 });
videoConsultationSchema.index({ 'scheduling.scheduledStartTime': 1 });

videoConsultationSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

videoConsultationSchema.virtual('totalDuration').get(function() {
  if (this.scheduling.actualStartTime && this.scheduling.actualEndTime) {
    return (this.scheduling.actualEndTime - this.scheduling.actualStartTime) / 1000 / 60;
  }
  return 0;
});

videoConsultationSchema.methods.start = async function() {
  this.status = 'active';
  this.scheduling.actualStartTime = new Date();
  await this.save();
};

videoConsultationSchema.methods.end = async function() {
  this.status = 'completed';
  this.scheduling.actualEndTime = new Date();
  this.scheduling.duration = this.totalDuration;
  await this.save();
};

videoConsultationSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  await this.save();
};

export default mongoose.model('VideoConsultation', videoConsultationSchema);
