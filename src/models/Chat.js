import mongoose from 'mongoose';
import { normalizeRole } from '../utils/roleUtils.js';

const chatSchema = new mongoose.Schema({
  // Chat Identification
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  chatType: {
    type: String,
    enum: ['client_admin', 'fundi_admin', 'client_fundi', 'group'],
    required: true
  },

  // Participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      // Accept common legacy aliases to avoid validation errors on older documents.
      enum: ['client', 'fundi', 'admin', 'shop_owner', 'super_admin', 'system', 'secretary'],
      required: true,
      set: function(val) {
        // Normalize role-like strings (e.g., 'super_admin' -> 'admin')
        return normalizeRole(val);
      }
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Chat Context
  context: {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute'
    },
    topic: String
  },

  // Messages
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'location', 'system'],
      default: 'text'
    },
    attachments: [{
      type: String, // Cloudinary URL
      fileName: String,
      fileType: String,
      fileSize: Number
    }],
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: Date
    }],
    deliveredTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deliveredAt: Date
    }],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    edited: {
      isEdited: { type: Boolean, default: false },
      editedAt: Date,
      originalContent: String
    },
    deleted: {
      isDeleted: { type: Boolean, default: false },
      deletedAt: Date,
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: String,
      reactedAt: Date
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Chat Settings
  settings: {
    isActive: {
      type: Boolean,
      default: true
    },
    allowAttachments: {
      type: Boolean,
      default: true
    },
    allowLocationSharing: {
      type: Boolean,
      default: true
    },
    maxParticipants: {
      type: Number,
      default: 10
    },
    language: {
      type: String,
      enum: ['en', 'sw'],
      default: 'en'
    }
  },

  // Moderation
  moderated: {
    type: Boolean,
    default: false
  },
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  moderationNotes: String,

  // Metadata
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    messageType: String
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
// `chatId` is unique on the schema; avoid duplicate index declaration
chatSchema.index({ chatType: 1 });
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ 'context.booking': 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ createdAt: -1 });

// Compound index for participant lookup
chatSchema.index({ 'participants.user': 1, 'lastMessage.timestamp': -1 });

// Virtual for active participants count
chatSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for isGroup chat
chatSchema.virtual('isGroup').get(function() {
  return this.chatType === 'group';
});

// Pre-save middleware to update last message and unread counts
chatSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: lastMessage.content,
      sender: lastMessage.sender,
      timestamp: lastMessage.timestamp,
      messageType: lastMessage.messageType
    };

    // Update unread counts for all participants except sender
    this.participants.forEach(participant => {
      if (participant.user.toString() !== lastMessage.sender.toString() && participant.isActive) {
        const currentCount = this.unreadCount.get(participant.user.toString()) || 0;
        this.unreadCount.set(participant.user.toString(), currentCount + 1);
      }
    });
  }
  next();
});

// Pre-validate: normalize any participant role strings to canonical enums to avoid
// Mongoose enum validation failures for legacy/alias values like 'super_admin'.
chatSchema.pre('validate', function(next) {
  if (Array.isArray(this.participants)) {
    this.participants = this.participants.map(p => ({
      ...p,
      role: normalizeRole(p.role)
    }));
  }
  next();
});

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (!message.readBy.some(read => read.user.toString() === userId)) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
      message.status = 'read';
    }
  });

  // Reset unread count for this user
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to add participant
chatSchema.methods.addParticipant = function(userId, role) {
  if (this.participants.length >= this.settings.maxParticipants) {
    throw new Error('Maximum participants reached');
  }

  if (!this.participants.some(p => p.user.toString() === userId)) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
  }
  return this.save();
};

export default mongoose.model('Chat', chatSchema);