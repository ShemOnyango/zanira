import crypto from 'crypto';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Fundi from '../models/Fundi.js';
import Admin from '../models/Admin.js';
import Shop from '../models/Shop.js';
import Verification from '../models/Verification.js';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  generate2FASecret, 
  generate2FAQrCode, 
  verify2FAToken, 
  generateVerificationCode,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  sanitizeUser 
} from '../utils/authUtils.js';
import { sendEmail, emailTemplates } from '../utils/emailUtils.js';
import logger from '../middleware/logger.js';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password, 
      role, 
      county, 
      town, 
      address,
      profession,
      shopName,
      shopType,
      adminRole 
    } = req.body;

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      county,
      town,
      address
    });

    // Create role-specific profile
    switch (role) {
      case 'client':
        await Client.create({ user: user._id });
        break;
      case 'fundi':
        await Fundi.create({ 
          user: user._id,
          profession: profession || 'plumber'
        });
        
        // Create verification record for fundi
        await Verification.create({
          applicant: user._id,
          applicantType: 'fundi',
          status: 'draft'
        });
        break;
      case 'admin':
        await Admin.create({ 
          user: user._id,
          role: adminRole || 'admin'
        });
        break;
      case 'shop_owner':
        await Shop.create({
          user: user._id,
          shopName,
          shopType: shopType || 'general',
          commissionRate: 10 // Default commission rate
        });
        
        // Create verification record for shop
        await Verification.create({
          applicant: user._id,
          applicantType: 'shop',
          status: 'draft'
        });
        break;
    }

    // Generate email verification token
    const { verificationToken, hashedToken } = generateEmailVerificationToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send welcome email with verification
    await sendEmail({
      email: user.email,
      subject: emailTemplates.welcome(user).subject,
      html: emailTemplates.welcome(user).html
    });

    // Send verification email
    await sendEmail({
      email: user.email,
      subject: emailTemplates.verification(user, verificationToken).subject,
      html: emailTemplates.verification(user, verificationToken).html
    });

    // Generate token
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set refresh token as cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Check if email or phone exists
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email or phone'
      });
    }

    // Check if user exists
    const user = await User.findOne({
      $or: [{ email }, { phone }]
    }).select('+password +twoFactorSecret +twoFactorEnabled');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email address before logging in.'
      });
    }

    // If 2FA is enabled, require 2FA verification
    if (user.twoFactorEnabled) {
      const temp2FAToken = generateToken({ id: user._id, requires2FA: true });
      
      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: 'Two-factor authentication required',
        temp2FAToken
      });
    }

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set refresh token as cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    });

    logger.info(`User logged in: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA
// @route   POST /api/v1/auth/verify-2fa
// @access  Public
export const verify2FA = async (req, res, next) => {
  try {
    const { token: twoFAToken, temp2FAToken } = req.body;

    if (!twoFAToken || !temp2FAToken) {
      return res.status(400).json({
        success: false,
        error: '2FA token and temporary token are required'
      });
    }

    // Verify temporary token
    let decoded;
    try {
      decoded = verifyToken(temp2FAToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired temporary token'
      });
    }

    if (!decoded.requires2FA) {
      return res.status(400).json({
        success: false,
        error: 'Invalid temporary token'
      });
    }

    // Get user
    const user = await User.findById(decoded.id).select('+twoFactorSecret');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify 2FA token
    const isVerified = verify2FAToken(twoFAToken, user.twoFactorSecret);
    if (!isVerified) {
      return res.status(401).json({
        success: false,
        error: 'Invalid 2FA token'
      });
    }

    // Generate final tokens
    const finalToken = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set refresh token as cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      data: {
        user: sanitizeUser(user),
        token: finalToken,
        refreshToken
      }
    });

    logger.info(`2FA verified for user: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

    logger.info(`User logged out: ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User belonging to this token no longer exists'
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        error: 'User recently changed password. Please log in again.'
      });
    }

    // Generate new tokens
    const newToken = generateToken({ id: user._id });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that email doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent'
      });
    }

    // Generate reset token
    const { resetToken, hashedToken } = generatePasswordResetToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send email
    await sendEmail({
      email: user.email,
      subject: emailTemplates.passwordReset(user, resetToken).subject,
      html: emailTemplates.passwordReset(user, resetToken).html
    });

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });

    logger.info(`Password reset requested for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PATCH /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token is invalid or has expired'
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000;
    await user.save();

    // Generate new token so user is logged in
    const newToken = generateToken({ id: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        token: newToken,
        user: sanitizeUser(user)
      }
    });

    logger.info(`Password reset successful for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   PATCH /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token
    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token is invalid or has expired'
      });
    }

    // Check if token has expired
    if (user.emailVerificationExpires && user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Token is invalid or has expired'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
        data: {
          user: sanitizeUser(user)
        }
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: sanitizeUser(user)
      }
    });

    logger.info(`Email verified for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    const { verificationToken, hashedToken } = generateEmailVerificationToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    await sendEmail({
      email: user.email,
      subject: emailTemplates.verification(user, verificationToken).subject,
      html: emailTemplates.verification(user, verificationToken).html
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });

    logger.info(`Verification email resent to: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Setup 2FA
// @route   POST /api/v1/auth/setup-2fa
// @access  Private
export const setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled'
      });
    }

    // Generate 2FA secret
    const secret = generate2FASecret(user);
    const qrCode = await generate2FAQrCode(secret);

    // Save secret to user (temporarily)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA setup initiated',
      data: {
        qrCode,
        secret: secret.base32,
        otpauth_url: secret.otpauth_url
      }
    });

    logger.info(`2FA setup initiated for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/v1/auth/verify-2fa-setup
// @access  Private
export const verify2FASetup = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: '2FA setup not initiated'
      });
    }

    // Verify 2FA token
    const isVerified = verify2FAToken(token, user.twoFactorSecret);
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 2FA token'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    // Send confirmation email
    await sendEmail({
      email: user.email,
      subject: 'Two-Factor Authentication Enabled - Zanira BuildLink',
      html: `
        <h2>2FA Enabled Successfully</h2>
        <p>Hello ${user.firstName},</p>
        <p>Two-factor authentication has been successfully enabled for your Zanira BuildLink account.</p>
        <p>If you did not enable 2FA, please contact support immediately.</p>
      `
    });

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        user: sanitizeUser(user)
      }
    });

    logger.info(`2FA enabled for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Disable 2FA
// @route   POST /api/v1/auth/disable-2fa
// @access  Private
export const disable2FA = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    if (!(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully',
      data: {
        user: sanitizeUser(user)
      }
    });

    logger.info(`2FA disabled for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    let userData = sanitizeUser(req.user);

    // Populate role-specific data
    switch (req.user.role) {
      case 'client':
        const client = await Client.findOne({ user: req.user._id });
        userData.clientProfile = client;
        break;
      case 'fundi':
        const fundi = await Fundi.findOne({ user: req.user._id });
        userData.fundiProfile = fundi;
        break;
      case 'admin':
      case 'super_admin':
        const admin = await Admin.findOne({ user: req.user._id });
        userData.adminProfile = admin;
        break;
      case 'shop_owner':
        const shop = await Shop.findOne({ user: req.user._id });
        userData.shopProfile = shop;
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    logger.info(`adminLogin attempt: email=${email} phone=${phone}`);

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email or phone'
      });
    }

    const user = await User.findOne({
      $or: [{ email }, { phone }],
      role: { $in: ['admin', 'super_admin'] }
    }).select('+password +twoFactorSecret +twoFactorEnabled');

    if (!user) {
      logger.info('adminLogin: user not found')
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const passwordOk = await user.correctPassword(password, user.password)
    logger.info(`adminLogin: found user id=${user._id} role=${user.role} passwordOk=${passwordOk}`)

    if (!passwordOk) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Your account has been deactivated. Please contact super admin.'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email address before logging in.'
      });
    }

    if (user.twoFactorEnabled) {
      const temp2FAToken = generateToken({ id: user._id, requires2FA: true });

      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: 'Two-factor authentication required',
        temp2FAToken
      });
    }

    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    user.lastLogin = new Date();
    await user.save();

    const admin = await Admin.findOne({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: { ...sanitizeUser(user), adminProfile: admin },
        token,
        refreshToken
      }
    });

    logger.info(`Admin logged in: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

export const createSuperAdmin = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      county,
      town,
      secretKey
    } = req.body;

    // Improved secret key validation
    const incomingSecret = (secretKey || '').toString().trim();
    const expectedSecret = (process.env.SUPER_ADMIN_SECRET_KEY || '').toString().trim();

    console.log('Secret Key Check:', {
      incomingLength: incomingSecret.length,
      expectedLength: expectedSecret.length,
      incoming: incomingSecret ? '***' : 'empty',
      expected: expectedSecret ? '***' : 'empty'
    });

    if (!incomingSecret || !expectedSecret) {
      return res.status(403).json({
        success: false,
        error: 'Secret key is required'
      });
    }

    if (incomingSecret !== expectedSecret) {
      return res.status(403).json({
        success: false,
        error: 'Invalid secret key'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: 'super_admin',
      county,
      town,
      isEmailVerified: true,
      isActive: true
    });

    await Admin.create({
      user: user._id,
      role: 'super_admin',
      permissions: {
        manage_users: true,
        manage_fundis: true,
        manage_verifications: true,
        manage_bookings: true,
        manage_payments: true,
        manage_system: true,
        view_analytics: true
      }
    });

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Set refresh token as cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    });

    logger.info(`Super admin created: ${user.email}`);
  } catch (error) {
    console.error('Super admin creation error:', error);
    next(error);
  }
};