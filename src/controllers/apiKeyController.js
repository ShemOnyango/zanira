import ApiKey from '../models/ApiKey.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../middleware/logger.js';

export const createApiKey = async (req, res, next) => {
  try {
    const { name, permissions, type, rateLimit, ipWhitelist, expiresIn } = req.body;
    const userId = req.user._id;

    const key = ApiKey.generateKey(type === 'admin' ? 'zbadmin' : 'zbapi');
    const keyHash = ApiKey.hashKey(key);

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await ApiKey.create({
      user: userId,
      name,
      key,
      keyHash,
      type: type || 'public',
      permissions: permissions || [],
      status: 'active',
      rateLimit: rateLimit || {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      ipWhitelist: ipWhitelist || [],
      expiresAt
    });

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'api_key_generated',
      targetEntity: {
        entityType: 'ApiKey',
        entityId: apiKey._id,
        entityDescription: name
      },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully. Store it securely - you will not be able to see it again.',
      data: {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key,
          type: apiKey.type,
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt
        }
      }
    });

    logger.info(`API key created: ${apiKey._id} by user ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const getUserApiKeys = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const apiKeys = await ApiKey.find({ user: userId })
      .select('-key -keyHash')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: { apiKeys }
    });
  } catch (error) {
    next(error);
  }
};

export const revokeApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    if (apiKey.user.toString() !== userId.toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to revoke this API key'
      });
    }

    await apiKey.revoke(userId, reason);

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'api_key_revoked',
      targetEntity: {
        entityType: 'ApiKey',
        entityId: apiKey._id,
        entityDescription: apiKey.name
      },
      metadata: { reason },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully'
    });

    logger.info(`API key revoked: ${apiKey._id}`);
  } catch (error) {
    next(error);
  }
};

export const rotateApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    if (apiKey.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to rotate this API key'
      });
    }

    const newKey = await apiKey.rotate();

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'api_key_rotated',
      targetEntity: {
        entityType: 'ApiKey',
        entityId: apiKey._id,
        entityDescription: apiKey.name
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'API key rotated successfully. Store the new key securely.',
      data: {
        newKey,
        rotatedAt: apiKey.lastRotatedAt
      }
    });

    logger.info(`API key rotated: ${apiKey._id}`);
  } catch (error) {
    next(error);
  }
};
