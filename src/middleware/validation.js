import { body, validationResult, param } from 'express-validator';
import User from '../models/User.js';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
  }

  next();
};

// Authentication validation rules
export const validateRegister = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' -' })
    .withMessage('First name can only contain letters, spaces, and hyphens'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' -' })
    .withMessage('Last name can only contain letters, spaces, and hyphens'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    // Keep dots and subaddressing for Gmail addresses (don't strip them)
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
    .custom(async (email) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
    }),

  body('phone')
    .matches(/^\+254[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number (+254XXXXXXXXX)')
    .custom(async (phone) => {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        throw new Error('Phone number is already registered');
      }
    }),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('role')
    .isIn(['client', 'fundi', 'admin', 'shop_owner'])
    .withMessage('Role must be client, fundi, admin, or shop_owner'),

  body('county')
    .notEmpty()
    .withMessage('County is required')
    .isIn([
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
      'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
      'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
      'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
      'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
      'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
      'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
      'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ])
    .withMessage('Please provide a valid Kenyan county'),

  body('town')
    .trim()
    .notEmpty()
    .withMessage('Town is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Town must be between 2 and 50 characters'),

  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    // Preserve Gmail dots/subaddressing to avoid accidental normalization
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),

  body('phone')
    .optional()
    .matches(/^\+254[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  (req, res, next) => {
    if (!req.body.email && !req.body.phone) {
      return res.status(400).json({
        success: false,
        error: 'Either email or phone is required'
      });
    }
    next();
  },

  handleValidationErrors
];

export const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    // Preserve Gmail dots/subaddressing
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),

  handleValidationErrors
];

export const validateResetPassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  handleValidationErrors
];

export const validateUpdatePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('newPasswordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// User validation rules
export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' -' })
    .withMessage('First name can only contain letters, spaces, and hyphens'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .isAlpha('en-US', { ignore: ' -' })
    .withMessage('Last name can only contain letters, spaces, and hyphens'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    // Preserve Gmail dots/subaddressing
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
    .custom(async (email, { req }) => {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
    }),

  body('phone')
    .optional()
    .matches(/^\+254[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number')
    .custom(async (phone, { req }) => {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (existingUser) {
        throw new Error('Phone number is already registered');
      }
    }),

  body('county')
    .optional()
    .isIn([
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
      'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
      'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
      'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
      'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
      'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
      'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
      'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ])
    .withMessage('Please provide a valid Kenyan county'),

  body('town')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Town must be between 2 and 50 characters'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  body('language')
    .optional()
    .isIn(['en', 'sw'])
    .withMessage('Language must be English (en) or Swahili (sw)'),

  handleValidationErrors
];

// ID validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  handleValidationErrors
];