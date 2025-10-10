import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

const SENSITIVE_ACTIONS = [
  'user_deleted', 'user_suspended', 'payment_refunded', 'payment_released',
  'fundi_rejected', 'fundi_suspended', 'shop_suspended', 'bulk_operation',
  'api_key_generated', 'api_key_revoked', 'data_exported', 'data_deleted',
  'withdrawal_processed', 'settings_changed', 'role_changed'
];

const SENSITIVE_ENDPOINTS = [
  '/api/v1/admin',
  '/api/v1/payments/release',
  '/api/v1/users/delete',
  '/api/v1/bulk',
  '/api/v1/api-keys'
];

export const auditLoggerMiddleware = () => {
  return async (req, res, next) => {
    const startTime = Date.now();

    const originalSend = res.json;
    res.json = function(data) {
      res.locals.responseBody = data;
      return originalSend.call(this, data);
    };

    res.on('finish', async () => {
      try {
        const isSensitiveEndpoint = SENSITIVE_ENDPOINTS.some(endpoint =>
          req.originalUrl.startsWith(endpoint)
        );

        const isModifyingOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

        if (req.user && (isSensitiveEndpoint || (isModifyingOperation && req.user.role === 'admin'))) {
          const action = determineAction(req);
          const severity = SENSITIVE_ACTIONS.includes(action) ? 'high' : 'medium';

          await AuditLog.logAction({
            userId: req.user._id,
            userRole: req.user.role,
            userEmail: req.user.email,
            action,
            targetEntity: extractTargetEntity(req),
            changes: extractChanges(req, res),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            severity,
            status: res.statusCode < 400 ? 'success' : 'failure',
            errorMessage: res.statusCode >= 400 ? res.locals.responseBody?.error : undefined,
            requestData: {
              method: req.method,
              endpoint: req.originalUrl,
              body: sanitizeRequestBody(req.body),
              query: req.query,
              params: req.params
            },
            responseData: {
              statusCode: res.statusCode,
              responseTime: Date.now() - startTime
            }
          });
        }
      } catch (error) {
        logger.error('Audit logging error:', error);
      }
    });

    next();
  };
};

function determineAction(req) {
  const method = req.method;
  const path = req.originalUrl;

  if (path.includes('/bulk')) return 'bulk_operation';
  if (path.includes('/verify')) return 'verification_action';
  if (path.includes('/suspend')) return 'suspension_action';
  if (path.includes('/payment')) return 'payment_action';
  if (path.includes('/api-keys')) return 'api_key_action';
  if (path.includes('/export')) return 'data_exported';

  switch (method) {
    case 'POST': return 'data_created';
    case 'PUT':
    case 'PATCH': return 'data_updated';
    case 'DELETE': return 'data_deleted';
    default: return 'data_accessed';
  }
}

function extractTargetEntity(req) {
  const parts = req.originalUrl.split('/');
  const entityType = parts[3];
  const entityId = req.params.id;

  return {
    entityType,
    entityId,
    entityDescription: req.body?.name || req.body?.title || entityType
  };
}

function extractChanges(req, res) {
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return {
      before: req.body.oldData || {},
      after: req.body
    };
  }
  return null;
}

function sanitizeRequestBody(body) {
  if (!body) return {};

  const sensitiveFields = ['password', 'pin', 'secret', 'token', 'apiKey'];
  const sanitized = { ...body };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}
