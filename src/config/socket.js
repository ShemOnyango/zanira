// server/src/config/socket.js (Fixed)
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';
import LocationTracking from '../models/LocationTracking.js';
import logger from '../middleware/logger.js';

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type']
      },
      // Fix for WebSocket connection issues
      allowEIO3: true, // Allow Engine.IO v3 clients (for compatibility)
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      cookie: false // Disable if not using sticky sessions
    });

    this.connectedUsers = new Map();
    this.userSockets = new Map();
    
    this.initializeMiddleware();
    this.initializeEventHandlers();
    
    logger.info('Socket service initialized');
  }

  // Socket authentication middleware
  initializeMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          logger.warn('Socket connection attempt without token');
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id role firstName lastName isActive profilePhoto');
        
        if (!user) {
          logger.warn(`Socket authentication failed: User not found for ID ${decoded.id}`);
          return next(new Error('Authentication error: User not found'));
        }

        if (!user.isActive) {
          logger.warn(`Socket authentication failed: User inactive for ID ${user._id}`);
          return next(new Error('Authentication error: User inactive'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userData = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePhoto: user.profilePhoto
        };

        logger.info(`Socket authentication successful for user: ${user._id}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', {
          error: error.message,
          stack: error.stack
        });
        
        if (error.name === 'JsonWebTokenError') {
          next(new Error('Authentication error: Invalid token'));
        } else if (error.name === 'TokenExpiredError') {
          next(new Error('Authentication error: Token expired'));
        } else {
          next(new Error('Authentication error: Invalid token'));
        }
      }
    });
  }

  // Rest of the socket.js file remains the same...
  initializeEventHandlers() {
    this.io.on('connection', (socket) => {
      const transport = socket.conn.transport.name;
      logger.info(`User connected: ${socket.userId} (${socket.userRole}) - socketId=${socket.id} transport=${transport}`);

      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        userData: socket.userData,
        connectedAt: new Date(),
        lastSeen: new Date(),
        transport: transport
      });

      // Store socket for user
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId).add(socket.id);

      // Join user to their personal room
      socket.join(socket.userId);

      // Notify user of successful connection
      socket.emit('connected', {
        success: true,
        message: 'Successfully connected to real-time service',
        user: socket.userData,
        socketId: socket.id
      });

      // Send current online users
      socket.emit('online_users', Array.from(this.connectedUsers.values()));

      // Notify others of user's online status
      socket.broadcast.emit('user_online', {
        userId: socket.userId,
        userData: socket.userData,
        timestamp: new Date()
      });

      // Rest of your existing event handlers...
      this.joinUserChatRooms(socket);
      this.handleChatEvents(socket);
      this.handleTypingEvents(socket);
      this.handlePresenceEvents(socket);
      this.handleLocationEvents(socket);

      // Handle custom join_user event
      socket.on('join_user', (userId) => {
        if (userId === socket.userId) {
          socket.join(userId);
          logger.debug(`User ${userId} joined their personal room via explicit event`);
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info(`User disconnected: ${socket.userId} - reason: ${reason}`);
        this.handleDisconnect(socket, reason);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for user ${socket.userId}:`, error);
      });
    });
  }

  // Handle location tracking events
  handleLocationEvents(socket) {
    // Fundi shares location update
    socket.on('location_update', async (data) => {
      try {
        const { sessionId, locationData } = data;
        
        // Validate session
        const session = await LocationTracking.findOne({
          sessionId,
          fundi: socket.userId,
          status: 'active'
        });

        if (!session) {
          socket.emit('error', { message: 'Invalid tracking session' });
          return;
        }

        // Add location update
        await session.addLocationUpdate(locationData);

        // Broadcast to all subscribers (client and admins)
        this.io.to(`location_${sessionId}`).emit('location_updated', {
          sessionId,
          location: session.currentLocation,
          eta: session.eta,
          timestamp: new Date()
        });

        // Check for geofence events
        if (session.geofence && session.geofence.arrivalDetected && !session.notifications?.arrivalSent) {
          this.io.to(`location_${sessionId}`).emit('fundi_arrived', {
            sessionId,
            arrivalTime: session.geofence.arrivalTime
          });
          
          session.notifications = session.notifications || {};
          session.notifications.arrivalSent = true;
          await session.save();
        }

      } catch (error) {
        logger.error('Error handling location update:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Client requests location refresh
    socket.on('request_location_refresh', async (data) => {
      try {
        const { sessionId } = data;
        
        const session = await LocationTracking.findOne({ sessionId })
          .populate('client')
          .populate('fundi', 'user');

        if (!session) {
          socket.emit('error', { message: 'Tracking session not found' });
          return;
        }

        // Check if client is authorized
        if (session.client.toString() !== socket.userId.toString()) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Send current location
        socket.emit('location_refreshed', {
          sessionId,
          currentLocation: session.currentLocation,
          eta: session.eta,
          geofence: session.geofence
        });

      } catch (error) {
        logger.error('Error refreshing location:', error);
        socket.emit('error', { message: 'Failed to refresh location' });
      }
    });
  }

  // Join user to their active chat rooms
  async joinUserChatRooms(socket) {
    try {
      const userChats = await Chat.find({
        'participants.user': socket.userId,
        'participants.isActive': true,
        'settings.isActive': true
      }).select('_id chatType participants');

      userChats.forEach(chat => {
        socket.join(chat._id.toString());
        logger.debug(`User ${socket.userId} joined chat room: ${chat._id}`);
      });

      socket.emit('chats_joined', {
        count: userChats.length,
        chats: userChats.map(chat => chat._id)
      });
    } catch (error) {
      logger.error('Error joining user chat rooms:', error);
    }
  }

  // Handle chat-related events
  handleChatEvents(socket) {
    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', attachments = [] } = data;

        // Validate input
        if (!chatId || !content) {
          socket.emit('error', { message: 'Chat ID and content are required' });
          return;
        }

        if (content.length > 5000) {
          socket.emit('error', { message: 'Message too long. Maximum 5000 characters.' });
          return;
        }

        // Find chat and verify user is participant
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const isParticipant = chat.participants.some(
          p => p.user.toString() === socket.userId && p.isActive
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not a participant in this chat' });
          return;
        }

        // Create message
        const message = {
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sender: socket.userId,
          content: content.trim(),
          messageType,
          attachments,
          timestamp: new Date(),
          readBy: [{
            user: socket.userId,
            readAt: new Date()
          }],
          deliveredTo: chat.participants.map(p => ({
            user: p.user,
            deliveredAt: new Date()
          })),
          status: 'sent'
        };

        // Add message to chat
        chat.messages.push(message);
        chat.lastMessage = {
          content: message.content,
          sender: message.sender,
          timestamp: message.timestamp,
          messageType: message.messageType
        };

        // Update unread counts
        chat.participants.forEach(participant => {
          if (participant.user.toString() !== socket.userId) {
            const currentCount = chat.unreadCount.get(participant.user.toString()) || 0;
            chat.unreadCount.set(participant.user.toString(), currentCount + 1);
          } else {
            chat.unreadCount.set(participant.user.toString(), 0);
          }
        });

        await chat.save();
        await chat.populate([
          { path: 'messages.sender', select: 'firstName lastName profilePhoto' },
          { path: 'participants.user', select: 'firstName lastName profilePhoto role' },
          { path: 'lastMessage.sender', select: 'firstName lastName profilePhoto' }
        ]);

        // Emit message to all participants
        this.io.to(chatId).emit('new_message', {
          chatId: chat._id,
          message: message,
          chat: chat
        });

        // Create notifications for offline users
        chat.participants.forEach(async (participant) => {
          if (participant.user.toString() !== socket.userId) {
            const isOnline = this.connectedUsers.has(participant.user.toString());
            
            if (!isOnline) {
              await Notification.create({
                recipient: participant.user,
                recipientType: this.getUserRole(participant.user),
                title: 'New Message',
                message: `New message from ${socket.userData.firstName} in your chat`,
                notificationType: 'new_message',
                action: 'navigate',
                actionData: {
                  screen: 'Chat',
                  params: { chatId: chat._id }
                },
                data: {
                  chatId: chat._id,
                  senderId: socket.userId,
                  messagePreview: content.length > 50 ? content.substring(0, 50) + '...' : content
                }
              });
            }
          }
        });

        logger.info(`Message sent in chat ${chatId} by user ${socket.userId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_messages_read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        let updated = false;
        messageIds.forEach(messageId => {
          const message = chat.messages.id(messageId);
          if (message && !message.readBy.some(read => read.user.toString() === socket.userId)) {
            message.readBy.push({
              user: socket.userId,
              readAt: new Date()
            });
            message.status = 'read';
            updated = true;
          }
        });

        if (updated) {
          chat.unreadCount.set(socket.userId.toString(), 0);
          await chat.save();

          // Notify other participants that messages were read
          socket.to(chatId).emit('messages_read', {
            chatId: chatId,
            messageIds: messageIds,
            readBy: socket.userId,
            readAt: new Date()
          });

          logger.debug(`Messages marked as read by user ${socket.userId} in chat ${chatId}`);
        }
      } catch (error) {
        logger.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Get chat history
    socket.on('get_chat_history', async (data) => {
      try {
        const { chatId, limit = 50, before = null } = data;

        const chat = await Chat.findById(chatId)
          .populate('messages.sender', 'firstName lastName profilePhoto')
          .populate('participants.user', 'firstName lastName profilePhoto role');

        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if user is participant
        const isParticipant = chat.participants.some(
          p => p.user._id.toString() === socket.userId && p.isActive
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to access this chat' });
          return;
        }

        // Filter and paginate messages
        let messages = chat.messages;
        if (before) {
          const beforeDate = new Date(before);
          messages = messages.filter(msg => msg.timestamp < beforeDate);
        }

        messages = messages.slice(-limit);

        socket.emit('chat_history', {
          chatId: chatId,
          messages: messages,
          hasMore: messages.length === limit
        });
      } catch (error) {
        logger.error('Error getting chat history:', error);
        socket.emit('error', { message: 'Failed to get chat history' });
      }
    });
  }

  // Handle typing indicators
  handleTypingEvents(socket) {
    const typingTimeouts = new Map();

    socket.on('typing_start', (data) => {
      const { chatId } = data;
      
      socket.to(chatId).emit('user_typing', {
        chatId,
        userId: socket.userId,
        userData: socket.userData,
        typing: true,
        timestamp: new Date()
      });

      // Clear existing timeout
      if (typingTimeouts.has(chatId)) {
        clearTimeout(typingTimeouts.get(chatId));
      }

      // Set timeout to automatically stop typing indicator
      const timeout = setTimeout(() => {
        socket.to(chatId).emit('user_typing', {
          chatId,
          userId: socket.userId,
          userData: socket.userData,
          typing: false,
          timestamp: new Date()
        });
        typingTimeouts.delete(chatId);
      }, 3000);

      typingTimeouts.set(chatId, timeout);
    });

    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      
      socket.to(chatId).emit('user_typing', {
        chatId,
        userId: socket.userId,
        userData: socket.userData,
        typing: false,
        timestamp: new Date()
      });

      // Clear timeout
      if (typingTimeouts.has(chatId)) {
        clearTimeout(typingTimeouts.get(chatId));
        typingTimeouts.delete(chatId);
      }
    });
  }

  // Handle user presence events
  handlePresenceEvents(socket) {
    socket.on('update_presence', (data) => {
      const { status, customStatus } = data;
      
      if (this.connectedUsers.has(socket.userId)) {
        const userData = this.connectedUsers.get(socket.userId);
        userData.lastSeen = new Date();
        userData.status = status;
        userData.customStatus = customStatus;
        
        // Broadcast presence update to relevant users
        socket.broadcast.emit('user_presence_update', {
          userId: socket.userId,
          userData: socket.userData,
          status,
          customStatus,
          timestamp: new Date()
        });
      }
    });

    // Periodic presence update
    setInterval(() => {
      if (this.connectedUsers.has(socket.userId)) {
        this.connectedUsers.get(socket.userId).lastSeen = new Date();
      }
    }, 30000); // Update every 30 seconds
  }

  // Handle user disconnect
  handleDisconnect(socket, reason) {
    logger.info(`User disconnected: ${socket.userId}, reason: ${reason}`);

    // Remove from user sockets
    if (this.userSockets.has(socket.userId)) {
      const userSockets = this.userSockets.get(socket.userId);
      userSockets.delete(socket.id);
      
      if (userSockets.size === 0) {
        this.userSockets.delete(socket.userId);
        this.connectedUsers.delete(socket.userId);
        
        // Notify others of user's offline status
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          userData: socket.userData,
          timestamp: new Date(),
          reason: reason
        });
      }
    }

    // Clean up typing timeouts
    // This would be implemented based on your timeout storage structure
  }

  // Utility method to get user role
  getUserRole(userId) {
    const user = this.connectedUsers.get(userId);
    return user ? user.userData.role : 'unknown';
  }

  // Method to send notification to specific user
  sendToUser(userId, event, data) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
      return true;
    }
    return false;
  }

  // Method to send to multiple users
  sendToUsers(userIds, event, data) {
    userIds.forEach(userId => this.sendToUser(userId, event, data));
  }

  // Method to send to all users in a room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userData._id,
      userData: user.userData,
      connectedAt: user.connectedAt,
      lastSeen: user.lastSeen
    }));
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

export default SocketService;