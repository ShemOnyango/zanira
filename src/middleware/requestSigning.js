import crypto from 'crypto';
import logger from './logger.js';

const SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');
const SIGNATURE_VALIDITY = 5 * 60 * 1000;

export const verifyRequestSignature = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).json({
      success: false,
      error: 'Request signature required'
    });
  }

  const now = Date.now();
  const requestTime = parseInt(timestamp);

  if (now - requestTime > SIGNATURE_VALIDITY) {
    return res.status(401).json({
      success: false,
      error: 'Request signature expired'
    });
  }

  const payload = JSON.stringify({
    method: req.method,
    path: req.originalUrl,
    body: req.body,
    timestamp
  });

  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('Invalid request signature detected', {
      ip: req.ip,
      path: req.originalUrl
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid request signature'
    });
  }

  next();
};

export function generateRequestSignature(method, path, body, timestamp) {
  const payload = JSON.stringify({
    method,
    path,
    body,
    timestamp: timestamp || Date.now()
  });

  return crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('hex');
}

export const requireSignedRequest = () => {
  return (req, res, next) => {
    if (req.user?.role === 'super_admin') {
      return next();
    }

    return verifyRequestSignature(req, res, next);
  };
};
