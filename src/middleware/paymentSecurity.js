import crypto from 'crypto';
import Payment from '../models/Payment.js';
import EscrowAccount from '../models/EscrowAccount.js';
import logger from './logger.js';
import rateLimit from 'express-rate-limit';

// Payment security middleware
export const validatePaymentRequest = async (req, res, next) => {
  try {
    const { amount, phoneNumber, bookingId } = req.body;

    // Validate required fields
    if (!amount || !phoneNumber || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Amount, phone number, and booking ID are required'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Check for duplicate payment attempts
    const recentPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['pending', 'processing', 'completed'] },
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    if (recentPayment) {
      return res.status(429).json({
        success: false,
        error: 'Duplicate payment attempt detected. Please wait before trying again.'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+254[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Please use +254XXXXXXXXX'
      });
    }

    // Check escrow account limits
    const escrowAccount = await EscrowAccount.getMainAccount();
    if (amount > escrowAccount.settings.maxSingleTransaction) {
      return res.status(400).json({
        success: false,
        error: `Transaction amount exceeds maximum limit of ${escrowAccount.settings.maxSingleTransaction} KES`
      });
    }

    // Add security metadata to request
    req.paymentSecurity = {
      clientIP: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      securityHash: crypto.createHash('sha256')
        .update(`${amount}${phoneNumber}${bookingId}${Date.now()}`)
        .digest('hex')
    };

    next();
  } catch (error) {
    logger.error('Payment validation error:', error);
    next(error);
  }
};

// Verify payment callback authenticity
export const verifyPaymentCallback = async (req, res, next) => {
  try {
    // In production, verify the callback comes from M-Pesa
    // This is a simplified version - actual implementation would verify signatures
    
    const callbackData = req.body;
    
    if (!callbackData || !callbackData.Body) {
      return res.status(400).json({
        success: false,
        error: 'Invalid callback data'
      });
    }

    // Log callback for audit
    logger.info('Payment callback received:', {
      type: 'mpesa_stk_callback',
      data: callbackData,
      ip: req.ip,
      timestamp: new Date()
    });

    req.callbackData = callbackData;
    next();
  } catch (error) {
    logger.error('Payment callback verification error:', error);
    next(error);
  }
};

// Rate limiting for payment endpoints
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 payment requests per windowMs
  message: {
    success: false,
    error: 'Too many payment attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Fraud detection middleware
export const fraudDetection = async (req, res, next) => {
  try {
    const { amount, phoneNumber } = req.body;
    const userId = req.user._id;

    // Check for suspicious patterns
    const recentPayments = await Payment.find({
      client: userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // Calculate total amount in last 24 hours
    const total24h = recentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Get escrow account limits
    const escrowAccount = await EscrowAccount.getMainAccount();
    
    if (total24h + amount > escrowAccount.settings.dailyTransactionLimit) {
      logger.warn(`Fraud detection: User ${userId} exceeded daily limit`, {
        userId,
        amount,
        total24h,
        limit: escrowAccount.settings.dailyTransactionLimit
      });

      return res.status(429).json({
        success: false,
        error: 'Daily transaction limit exceeded. Please contact support.'
      });
    }

    // Check for multiple payments from same phone number
    const samePhonePayments = await Payment.find({
      'mpesa.phoneNumber': phoneNumber,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    if (samePhonePayments.length >= 3) {
      logger.warn(`Fraud detection: Multiple payments from phone ${phoneNumber}`, {
        phoneNumber,
        count: samePhonePayments.length
      });

      return res.status(429).json({
        success: false,
        error: 'Multiple payment attempts detected. Please wait before trying again.'
      });
    }

    next();
  } catch (error) {
    logger.error('Fraud detection error:', error);
    next(error);
  }
};

// Payment encryption utilities
export const encryptPaymentData = (data, key = process.env.PAYMENT_ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('ZaniraBuildLink'));
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: authTag.toString('hex')
  };
};

export const decryptPaymentData = (encryptedData, key = process.env.PAYMENT_ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('ZaniraBuildLink'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};