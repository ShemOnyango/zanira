import User from '../models/User.js';
import Client from '../models/Client.js';
import Fundi from '../models/Fundi.js';
import Admin from '../models/Admin.js';
import Shop from '../models/Shop.js';
import { sanitizeUser, generateToken } from '../utils/authUtils.js';
import cloudinary from '../config/cloudinary.js';
import logger from '../middleware/logger.js';

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    let userData = sanitizeUser(req.user);

    // Populate role-specific data - fix case blocks
    switch (req.user.role) {
      case 'client': {
        const client = await Client.findOne({ user: req.user._id });
        userData.clientProfile = client;
        break;
      }
      case 'fundi': {
        const fundi = await Fundi.findOne({ user: req.user._id })
          .populate('servicesOffered.service');
        userData.fundiProfile = fundi;
        break;
      }
      case 'admin': {
        const admin = await Admin.findOne({ user: req.user._id });
        userData.adminProfile = admin;
        break;
      }
      case 'shop_owner': {
        const shop = await Shop.findOne({ user: req.user._id });
        userData.shopProfile = shop;
        break;
      }
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

// @desc    Update user profile
// @route   PATCH /api/v1/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'county', 'town', 
      'address', 'gender', 'language', 'dateOfBirth', 'profilePhoto'
    ];

    // Filter allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: sanitizeUser(user)
      }
    });

    logger.info(`Profile updated for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PATCH /api/v1/users/update-password
// @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken({ id: user._id });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {
        token,
        user: sanitizeUser(user)
      }
    });

    logger.info(`Password updated for: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate account
// @route   PATCH /api/v1/users/deactivate
// @access  Private
export const deactivateAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    if (!(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Deactivate account
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });

    logger.info(`Account deactivated: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let userData = sanitizeUser(user);

    // Populate role-specific data based on admin permissions - fix case blocks
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      switch (user.role) {
        case 'client': {
          const client = await Client.findOne({ user: user._id });
          userData.clientProfile = client;
          break;
        }
        case 'fundi': {
          const fundi = await Fundi.findOne({ user: user._id });
          userData.fundiProfile = fundi;
          break;
        }
        case 'admin': {
          const admin = await Admin.findOne({ user: user._id });
          userData.adminProfile = admin;
          break;
        }
        case 'shop_owner': {
          const shop = await Shop.findOne({ user: user._id });
          userData.shopProfile = shop;
          break;
        }
      }
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

// @desc    Get all users (Admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const {
      role,
      county,
      town,
      isActive,
      isVerified,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (county) filter.county = county;
    if (town) filter.town = { $regex: town, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isVerified !== undefined) filter.isEmailVerified = isVerified === 'true';

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get users
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires -twoFactorSecret');

    // Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (Admin only)
// @route   PATCH /api/v1/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'county', 'town', 
      'address', 'gender', 'language', 'dateOfBirth', 'profilePhoto',
      'isActive', 'isEmailVerified', 'isPhoneVerified'
    ];

    // Filter allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: sanitizeUser(user)
      }
    });

    logger.info(`User updated by admin ${req.user.email}: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deleting super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete super admin'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

    logger.info(`User deleted by admin ${req.user.email}: ${user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile photo
// @route   POST /api/v1/users/profile/photo
// @access  Private
export const uploadProfilePhotoController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Multer/Cloudinary storage usually provides a URL in req.file.path or req.file.secure_url
    const fileUrl = req.file.path || req.file.secure_url || req.file.url || req.file.filename || null;

    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'Uploaded file URL not available' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: fileUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        user: sanitizeUser(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload general user document
// @route   POST /api/v1/users/profile/document
// @access  Private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'zanira/documents',
      resource_type: 'auto'
    });

    // Determine which field to update (e.g., nationalId, license, etc.)
    const field = req.body.field;
    if (!field) {
      return res.status(400).json({
        success: false,
        error: 'Missing field name in request body'
      });
    }

    user[field] = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        field,
        url: result.secure_url
      }
    });

    logger.info(`Document uploaded for user ${user._id} - field: ${field}`);
  } catch (error) {
    logger.error('Document upload error:', error);
    next(error);
  }
};
