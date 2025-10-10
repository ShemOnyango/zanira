import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Fundi from '../models/Fundi.js';
import Admin from '../models/Admin.js';
import Shop from '../models/Shop.js';
import logger from './logger.js';

// Protect routes - verify JWT
export const protect = async (req, res, next) => {
  try {
    let token;

    // Debug: log incoming request and whether Authorization header is present
    try {
      logger.info(`Protect middleware hit: ${req.method} ${req.originalUrl} - Authorization header present: ${!!req.headers.authorization} - Content-Type: ${req.headers['content-type']}`);
    } catch (e) {
      // swallow logging errors
      // eslint-disable-next-line no-console
      console.log('Protect middleware log error', e);
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('+passwordChangedAt');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User belonging to this token no longer exists.'
        });
      }

      // Check if user changed password after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          error: 'User recently changed password. Please log in again.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Your account has been deactivated. Please contact support.'
        });
      }

      // Attach user to request
      req.user = user;

      // Debug: log resolved user role/id
      try {
        logger.info(`Protect resolved user: id=${user._id} role=${user.role} email=${user.email}`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Protect logger error', e);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route. Invalid token.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      logger.info(`Authorize middleware: route=${req.method} ${req.originalUrl} allowedRoles=${roles.join(',')} resolvedRole=${req.user?.role}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Authorize logger error', e);
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      let hasPerm = false;

      switch (req.user.role) {
        case 'super_admin':
          hasPerm = true;
          break;
        case 'admin':
          const admin = await Admin.findOne({ user: req.user._id });
          hasPerm = admin?.permissions[permission] || false;
          break;
        case 'fundi':
          // Fundi-specific permissions can be added here
          hasPerm = ['view_profile', 'update_profile'].includes(permission);
          break;
        case 'client':
          // Client-specific permissions
          hasPerm = ['view_profile', 'update_profile'].includes(permission);
          break;
        case 'shop_owner':
          // Shop owner permissions
          hasPerm = ['manage_shop', 'view_analytics'].includes(permission);
          break;
      }

      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          error: `You don't have permission to ${permission}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional auth - doesn't throw error if no token
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't throw error
        console.log('Optional auth: Invalid token');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is verified
export const requireVerification = (userType = 'all') => {
  return async (req, res, next) => {
    try {
      let isVerified = false;

      switch (req.user.role) {
        case 'fundi':
          const fundi = await Fundi.findOne({ user: req.user._id });
          isVerified = fundi?.verification.overallStatus === 'verified';
          break;
        case 'client':
          const client = await Client.findOne({ user: req.user._id });
          isVerified = client?.idVerified || false;
          break;
        case 'shop_owner':
          const shop = await Shop.findOne({ user: req.user._id });
          isVerified = shop?.verification.overallStatus === 'verified';
          break;
        case 'admin':
        case 'super_admin':
          isVerified = true;
          break;
        default:
          isVerified = false;
      }

      if (!isVerified) {
        return res.status(403).json({
          success: false,
          error: `Your ${req.user.role} account needs to be verified to access this feature.`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Backwards-compatibility alias: some routes import `restrictTo`.
// `authorize` is the primary name; provide `restrictTo` for existing callers.
export const restrictTo = authorize;