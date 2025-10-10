import ApiKey from '../models/ApiKey.js';
import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKeyHeader = req.headers['x-api-key'];

    if (!apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const keyHash = ApiKey.hashKey(apiKeyHeader);
    const apiKey = await ApiKey.findOne({ keyHash }).select('+keyHash').populate('user');

    if (!apiKey) {
      await AuditLog.logAction({
        userId: null,
        userRole: 'unknown',
        userEmail: 'unknown',
        action: 'security_alert',
        metadata: { reason: 'Invalid API key attempt' },
        severity: 'high',
        status: 'failure',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    const canMakeRequest = apiKey.canMakeRequest();
    if (!canMakeRequest.allowed) {
      return res.status(403).json({
        success: false,
        error: canMakeRequest.reason
      });
    }

    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIP = req.ip;
      if (!apiKey.ipWhitelist.includes(clientIP)) {
        await AuditLog.logAction({
          userId: apiKey.user._id,
          userRole: apiKey.user.role,
          userEmail: apiKey.user.email,
          action: 'security_alert',
          metadata: {
            reason: 'IP not whitelisted',
            clientIP,
            allowedIPs: apiKey.ipWhitelist
          },
          severity: 'high',
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        return res.status(403).json({
          success: false,
          error: 'IP address not authorized'
        });
      }
    }

    if (apiKey.usage.requestsToday >= apiKey.rateLimit.requestsPerDay) {
      return res.status(429).json({
        success: false,
        error: 'Daily request limit exceeded'
      });
    }

    await apiKey.recordUsage();

    req.apiKey = apiKey;
    req.user = apiKey.user;

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    next(error);
  }
};

export const requireApiPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key authentication required'
      });
    }

    if (!req.apiKey.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${permission}`
      });
    }

    next();
  };
};
