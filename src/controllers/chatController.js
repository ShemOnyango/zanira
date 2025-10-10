// controllers/chatController.js
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// @desc    Get all chats for current user
// @route   GET /api/v1/chats
// @access  Private
export const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build query based on user role
  let query = {
    'participants.user': userId,
    'participants.isActive': true
  };

  // For clients and fundis, only show their chats with admin
  if (userRole === 'client' || userRole === 'fundi') {
    query.chatType = `${userRole}_admin`;
  }

  // For admin, show all chats they're participating in
  if (userRole === 'admin' || userRole === 'super_admin') {
    query.chatType = { $in: ['client_admin', 'fundi_admin', 'group'] };
  }

  const chats = await Chat.find(query)
    .populate('participants.user', 'name email role avatar isVerified')
    .populate('context.booking', 'description status agreedPrice')
    .populate('lastMessage.sender', 'name role')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    .lean();

  // Calculate unread counts for current user
  const chatsWithUnread = chats.map(chat => {
    const unreadCount = chat.unreadCount?.get(userId.toString()) || 0;
    return {
      ...chat,
      unreadCount,
      activeParticipantsCount: chat.participants.filter(p => p.isActive).length
    };
  });

  res.status(200).json({
    success: true,
    count: chatsWithUnread.length,
    data: chatsWithUnread
  });
});

// @desc    Get single chat
// @route   GET /api/v1/chats/:id
// @access  Private
export const getChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    'participants.user': req.user._id,
    'participants.isActive': true
  })
    .populate('participants.user', 'name email role avatar isVerified')
    .populate('context.booking', 'description status agreedPrice client fundi')
    .populate('messages.sender', 'name role avatar')
    .populate('messages.attachments')
    .populate('messages.readBy.user', 'name role')
    .populate('moderator', 'name email');

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or access denied');
  }

  // Mark messages as read for current user
  await chat.markAsRead(req.user._id);

  res.status(200).json({
    success: true,
    data: chat
  });
});

// @desc    Create new chat
// @route   POST /api/v1/chats
// @access  Private
export const createChat = asyncHandler(async (req, res) => {
  const { bookingId, topic, initialMessage } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Validate booking if provided
  let booking = null;
  if (bookingId) {
    booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    // Authorization: client can only chat about their bookings, fundi about assigned bookings
    if (userRole === 'client' && booking.client.toString() !== userId.toString()) {
      res.status(403);
      throw new Error('Not authorized to create chat for this booking');
    }

    if (userRole === 'fundi' && booking.fundi?.toString() !== userId.toString()) {
      res.status(403);
      throw new Error('Not authorized to create chat for this booking');
    }
  }

  // Determine chat type based on user role
  let chatType;
  let participants = [{
    user: userId,
    role: userRole,
    joinedAt: new Date(),
    isActive: true
  }];

  // Clients and Fundis always chat with Admin
  if (userRole === 'client' || userRole === 'fundi') {
    chatType = `${userRole}_admin`;
    
    // Find available admin (round-robin or first available)
    const admin = await User.findOne({ 
      role: { $in: ['admin', 'super_admin'] }, 
      status: 'active' 
    }).sort({ lastLogin: -1 });

    if (!admin) {
      res.status(503);
      throw new Error('No admin available at the moment');
    }

    participants.push({
      user: admin._id,
      role: admin.role,
      joinedAt: new Date(),
      isActive: true
    });
  } else if (userRole === 'admin' || userRole === 'super_admin') {
    // Admin can create group chats or direct chats
    chatType = req.body.chatType || 'group';
    
    if (req.body.participants && Array.isArray(req.body.participants)) {
      // Validate all participants exist
      const participantUsers = await User.find({
        _id: { $in: req.body.participants },
        status: 'active'
      });

      if (participantUsers.length !== req.body.participants.length) {
        res.status(400);
        throw new Error('One or more participants not found');
      }

      // Add participants with their roles
      participantUsers.forEach(user => {
        participants.push({
          user: user._id,
          role: user.role,
          joinedAt: new Date(),
          isActive: true
        });
      });
    }
  } else {
    res.status(403);
    throw new Error('Not authorized to create chats');
  }

  // Create chat
  const chat = await Chat.create({
    chatId: uuidv4(),
    chatType,
    participants,
    context: {
      booking: bookingId,
      topic: topic || (booking ? `Discussion about booking ${booking._id}` : 'General Inquiry')
    },
    messages: initialMessage ? [{
      messageId: uuidv4(),
      sender: userId,
      content: initialMessage,
      messageType: 'text',
      readBy: [{ user: userId, readAt: new Date() }],
      deliveredTo: participants.map(p => ({ user: p.user, deliveredAt: new Date() })),
      timestamp: new Date()
    }] : [],
    settings: {
      allowAttachments: true,
      allowLocationSharing: userRole === 'fundi', // Only fundis can share location for job purposes
      maxParticipants: chatType === 'group' ? 10 : 2,
      language: req.user.language || 'en'
    }
  });

  await chat.populate('participants.user', 'name email role avatar');
  await chat.populate('context.booking', 'description status');

  // Emit real-time event for new chat creation
  // TODO: Implement Socket.io emission
  // req.app.get('io').to(participants.map(p => p.user.toString())).emit('chat:created', chat);

  res.status(201).json({
    success: true,
    data: chat
  });
});

// @desc    Add participant to chat
// @route   PATCH /api/v1/chats/:id/participants
// @access  Private/Admin
export const addParticipant = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  
  if (!userId || !role) {
    res.status(400);
    throw new Error('User ID and role are required');
  }

  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Only admin can add participants
  if (!req.user.role.includes('admin')) {
    res.status(403);
    throw new Error('Not authorized to add participants');
  }

  // Check if user exists and is active
  const userToAdd = await User.findOne({ 
    _id: userId, 
    status: 'active' 
  });

  if (!userToAdd) {
    res.status(404);
    throw new Error('User not found or inactive');
  }

  // Add participant
  await chat.addParticipant(userId, role);
  await chat.populate('participants.user', 'name email role avatar');

  // Add system message about new participant
  const systemMessage = {
    messageId: uuidv4(),
    sender: req.user._id, // Admin who added the participant
    content: `${userToAdd.name} was added to the chat`,
    messageType: 'system',
    timestamp: new Date()
  };

  chat.messages.push(systemMessage);
  await chat.save();

  // TODO: Emit real-time event
  // req.app.get('io').to(chat.participants.map(p => p.user.toString())).emit('participant:added', { chatId: chat._id, participant: userToAdd });

  res.status(200).json({
    success: true,
    data: chat
  });
});

// @desc    Remove participant from chat
// @route   DELETE /api/v1/chats/:id/participants/:participantId
// @access  Private/Admin
export const removeParticipant = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  // Only admin can remove participants
  if (!req.user.role.includes('admin')) {
    res.status(403);
    throw new Error('Not authorized to remove participants');
  }

  const participantIndex = chat.participants.findIndex(
    p => p.user.toString() === req.params.participantId && p.isActive
  );

  if (participantIndex === -1) {
    res.status(404);
    throw new Error('Participant not found in chat');
  }

  // Mark participant as inactive
  chat.participants[participantIndex].isActive = false;
  chat.participants[participantIndex].leftAt = new Date();

  // Add system message about participant removal
  const removedUser = await User.findById(req.params.participantId);
  const systemMessage = {
    messageId: uuidv4(),
    sender: req.user._id,
    content: `${removedUser?.name || 'User'} was removed from the chat`,
    messageType: 'system',
    timestamp: new Date()
  };

  chat.messages.push(systemMessage);
  await chat.save();

  await chat.populate('participants.user', 'name email role avatar');

  // TODO: Emit real-time event
  // req.app.get('io').to(chat.participants.map(p => p.user.toString())).emit('participant:removed', { chatId: chat._id, participantId: req.params.participantId });

  res.status(200).json({
    success: true,
    data: chat
  });
});

// @desc    Get chat history with pagination
// @route   GET /api/v1/chats/:id/history
// @access  Private
export const getChatHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const chat = await Chat.findOne({
    _id: req.params.id,
    'participants.user': req.user._id,
    'participants.isActive': true
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or access denied');
  }

  // Get messages with pagination
  const messages = await Chat.aggregate([
    { $match: { _id: chat._id } },
    { $unwind: '$messages' },
    { $sort: { 'messages.timestamp': -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) },
    {
      $project: {
        _id: '$messages._id',
        messageId: '$messages.messageId',
        sender: '$messages.sender',
        content: '$messages.content',
        messageType: '$messages.messageType',
        attachments: '$messages.attachments',
        location: '$messages.location',
        readBy: '$messages.readBy',
        reactions: '$messages.reactions',
        timestamp: '$messages.timestamp',
        edited: '$messages.edited',
        deleted: '$messages.deleted'
      }
    }
  ]);

  // Populate sender information
  await Chat.populate(messages, {
    path: 'sender',
    select: 'name role avatar'
  });

  await Chat.populate(messages, {
    path: 'readBy.user',
    select: 'name role'
  });

  const totalMessages = chat.messages.length;
  const totalPages = Math.ceil(totalMessages / limit);

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalMessages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
});

// @desc    Send message in chat
// @route   POST /api/v1/chats/:id/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { content, messageType = 'text', attachments, location } = req.body;

  if (!content && !attachments?.length && !location) {
    res.status(400);
    throw new Error('Message content, attachments, or location is required');
  }

  const chat = await Chat.findOne({
    _id: req.params.id,
    'participants.user': req.user._id,
    'participants.isActive': true
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or access denied');
  }

  // Validate message type permissions
  if (messageType === 'location' && !chat.settings.allowLocationSharing) {
    res.status(403);
    throw new Error('Location sharing is not allowed in this chat');
  }

  if ((attachments && attachments.length > 0) && !chat.settings.allowAttachments) {
    res.status(403);
    throw new Error('Attachments are not allowed in this chat');
  }

  // Create new message
  const newMessage = {
    messageId: uuidv4(),
    sender: req.user._id,
    content,
    messageType,
    attachments: attachments || [],
    location: location || null,
    readBy: [{ user: req.user._id, readAt: new Date() }],
    deliveredTo: chat.participants
      .filter(p => p.isActive)
      .map(p => ({ user: p.user, deliveredAt: new Date() })),
    timestamp: new Date()
  };

  chat.messages.push(newMessage);
  await chat.save();

  // Populate the new message for response
  await chat.populate('messages.sender', 'name role avatar');
  const populatedMessage = chat.messages[chat.messages.length - 1];

  // TODO: Emit real-time message
  // req.app.get('io').to(chat.participants.map(p => p.user.toString())).emit('message:sent', { chatId: chat._id, message: populatedMessage });

  res.status(201).json({
    success: true,
    data: populatedMessage
  });
});

// @desc    Mark messages as read
// @route   PUT /api/v1/chats/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    'participants.user': req.user._id,
    'participants.isActive': true
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found or access denied');
  }

  await chat.markAsRead(req.user._id);

  // TODO: Emit real-time read receipt
  // req.app.get('io').to(chat.participants.map(p => p.user.toString())).emit('messages:read', { chatId: chat._id, userId: req.user._id });

  res.status(200).json({
    success: true,
    data: { message: 'Messages marked as read' }
  });
});

// @desc    Get or create chat for booking
// @route   POST /api/v1/chats/booking/:bookingId
// @access  Private
export const getOrCreateBookingChat = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Authorization check
  if (userRole === 'client' && booking.client.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this booking chat');
  }

  if (userRole === 'fundi' && booking.fundi?.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this booking chat');
  }

  // Find existing chat for this booking
  let chat = await Chat.findOne({
    'context.booking': bookingId,
    'participants.user': userId,
    'participants.isActive': true
  })
    .populate('participants.user', 'name email role avatar')
    .populate('context.booking', 'description status agreedPrice');

  // Create new chat if doesn't exist
  if (!chat) {
    const admin = await User.findOne({ 
      role: { $in: ['admin', 'super_admin'] }, 
      status: 'active' 
    }).sort({ lastLogin: -1 });

    if (!admin) {
      res.status(503);
      throw new Error('No admin available at the moment');
    }

    chat = await Chat.create({
      chatId: uuidv4(),
      chatType: `${userRole}_admin`,
      participants: [
        {
          user: userId,
          role: userRole,
          joinedAt: new Date(),
          isActive: true
        },
        {
          user: admin._id,
          role: admin.role,
          joinedAt: new Date(),
          isActive: true
        }
      ],
      context: {
        booking: bookingId,
        topic: `Discussion about booking: ${booking.description?.substring(0, 50)}...`
      },
      messages: [],
      settings: {
        allowAttachments: true,
        allowLocationSharing: userRole === 'fundi',
        maxParticipants: 2,
        language: req.user.language || 'en'
      }
    });

    await chat.populate('participants.user', 'name email role avatar');
    await chat.populate('context.booking', 'description status agreedPrice');
  }

  res.status(200).json({
    success: true,
    data: chat
  });
});