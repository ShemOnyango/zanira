import rateLimit from 'express-rate-limit';

export const roleBasedRateLimiter = (req, res, next) => {
  const userRole = req.user?.role || 'guest';

  const limits = {
    guest: { windowMs: 15 * 60 * 1000, max: 20 },
    client: { windowMs: 15 * 60 * 1000, max: 100 },
    fundi: { windowMs: 15 * 60 * 1000, max: 150 },
    shop_owner: { windowMs: 15 * 60 * 1000, max: 150 },
    admin: { windowMs: 15 * 60 * 1000, max: 500 },
    super_admin: { windowMs: 15 * 60 * 1000, max: 1000 }
  };

  const config = limits[userRole] || limits.guest;

  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: `Too many requests from this ${userRole}. Please try again later.`
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.user?.role === 'super_admin'
  });

  return limiter(req, res, next);
};

export const createSensitiveOperationLimiter = () => {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      error: 'Too many sensitive operations. Please try again later.'
    },
    skipSuccessfulRequests: true
  });
};

export const createPaymentLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: {
      success: false,
      error: 'Too many payment requests. Please wait before trying again.'
    },
    skipSuccessfulRequests: true
  });
};

export const createAuthLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      error: 'Too many authentication attempts. Please try again later.'
    },
    skipSuccessfulRequests: true
  });
};
