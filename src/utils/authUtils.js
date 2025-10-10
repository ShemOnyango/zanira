import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// Generate 2FA secret
export const generate2FASecret = (user) => {
  const secret = speakeasy.generateSecret({
    name: `Zanira BuildLink (${user.email})`,
    issuer: 'Zanira BuildLink'
  });

  return secret;
};

// Generate 2FA QR code
export const generate2FAQrCode = async (secret) => {
  try {
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return qrCode;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

// Verify 2FA token
export const verify2FAToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps before/after for clock skew
  });
};

// Generate random code for verification
export const generateVerificationCode = (length = 6) => {
  return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length) - 1).toString();
};

// Generate secure random string
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash data
export const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashData(resetToken);
  
  return {
    resetToken,
    hashedToken
  };
};

// Generate email verification token
export const generateEmailVerificationToken = () => {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashData(verificationToken);
  
  return {
    verificationToken,
    hashedToken
  };
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    requirements: {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};

// Generate session ID
export const generateSessionId = () => {
  return `sess_${crypto.randomBytes(16).toString('hex')}`;
};

// Sanitize user data for response
export const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  // Remove sensitive fields
  const { password, passwordChangedAt, passwordResetToken, passwordResetExpires, twoFactorSecret, ...sanitized } = userObj;
  
  return sanitized;
};