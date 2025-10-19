import logger from './logger.js';
import AuditLog from '../models/AuditLog.js';

const ADMIN_WHITELIST = (process.env.ADMIN_IP_WHITELIST || '').split(',').filter(Boolean);

const ENABLE_IP_WHITELIST = process.env.ENABLE_ADMIN_IP_WHITELIST === 'true';

export const ipWhitelistMiddleware = (req, res, next) => {
  // Allow preflight requests through
  if (req.method === 'OPTIONS') return next();
  if (!ENABLE_IP_WHITELIST || ADMIN_WHITELIST.length === 0) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  if (['admin', 'super_admin'].includes(req.user?.role)) {
    if (!ADMIN_WHITELIST.includes(clientIP)) {
      logger.warn(`Unauthorized admin access attempt from IP: ${clientIP}`);

      AuditLog.logAction({
        userId: req.user._id,
        userRole: req.user.role,
        userEmail: req.user.email,
        action: 'security_alert',
        metadata: {
          reason: 'Admin IP not whitelisted',
          clientIP,
          allowedIPs: ADMIN_WHITELIST
        },
        severity: 'critical',
        status: 'failure',
        ipAddress: clientIP,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied. Your IP address is not authorized for admin access.'
      });
    }
  }

  next();
};

export const requireWhitelistedIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (ADMIN_WHITELIST.length > 0 && !ADMIN_WHITELIST.includes(clientIP)) {
    logger.warn(`Blocked access from non-whitelisted IP: ${clientIP}`);

    return res.status(403).json({
      success: false,
      error: 'Access denied. IP address not authorized.'
    });
  }

  next();
};
