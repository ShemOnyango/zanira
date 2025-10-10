// Ensure environment variables from .env are loaded before other imports
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

// (dotenv is loaded via the top-level side-effect import)

// Import routes
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import serviceRoutes from './src/routes/services.js';
import bookingRoutes from './src/routes/bookings.js';
import adminRoutes from './src/routes/admin.js';
import paymentRoutes from './src/routes/payments.js';
import chatRoutes from './src/routes/chats.js';
import notificationRoutes from './src/routes/notifications.js';
import analyticsRoutes from './src/routes/analytics.js';
import matchingRoutes from './src/routes/matching.js';
import disputeRoutes from './src/routes/disputes.js';
import locationRoutes from './src/routes/location.js';
import shopRoutes from './src/routes/shops.js';
import bulkRoutes from './src/routes/bulk.js';
import subscriptionRoutes from './src/routes/subscriptions.js';
import walletRoutes from './src/routes/wallet.js';
import referralRoutes from './src/routes/referrals.js';
import videoConsultationRoutes from './src/routes/videoConsultations.js';
import apiKeyRoutes from './src/routes/apiKeys.js';
import advancedAnalyticsRoutes from './src/routes/advancedAnalytics.js';
import biddingRoutes from './src/routes/bidding.js';
import filesRoutes from './src/routes/files.js';

// Import middleware
import errorHandler from './src/middleware/errorHandler.js';
import logger from './src/middleware/logger.js';
import morgan from 'morgan';
import { i18nMiddleware } from './src/utils/i18n.js';
import { auditLoggerMiddleware } from './src/middleware/auditLogger.js';
import { ipWhitelistMiddleware } from './src/middleware/ipWhitelist.js';

// Import socket service
import SocketService from './src/config/socket.js';

const app = express();
const server = createServer(app);

// Initialize Socket.io
const io = new SocketService(server);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));

// Compression middleware
app.use(compression());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging (use morgan with winston stream)
app.use(morgan(process.env.MORGAN_FORMAT || 'combined', { stream: logger.stream }));

// i18n middleware for multi-language support
app.use(i18nMiddleware);

// Audit logging middleware
app.use(auditLoggerMiddleware());

// IP whitelist for admin routes
app.use(ipWhitelistMiddleware);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zanira BuildLink API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: 'connected',
      redis: 'connected',
      payments: 'active',
      notifications: 'active'
    }
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
// Debug: log requests to profile photo upload to trace auth headers
app.use((req, res, next) => {
  try {
    if (req.originalUrl && req.originalUrl.includes('/api/v1/users/profile/photo')) {
      logger.info(`Incoming upload request: ${req.method} ${req.originalUrl} - headers: ${JSON.stringify({
        authorization: req.headers.authorization,
        'content-type': req.headers['content-type']
      })}`);
    }
  } catch (e) {
    console.log('Upload debug middleware error', e);
  }
  next();
});
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/matching', matchingRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/shops', shopRoutes);
app.use('/api/v1/bulk', bulkRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/video-consultations', videoConsultationRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/v1/bidding', biddingRoutes);
app.use('/api/v1/files', filesRoutes);

// Serve uploaded files statically (if needed)
app.use('/api/v1/uploads', express.static('uploads'));

// Handle undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  await connectDB();
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    logger.info('Process terminated');
  });
});

export default app;