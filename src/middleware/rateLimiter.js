// src/middleware/rateLimiter.js
// Rate limiting using express-rate-limit.
// Auth endpoints: max 5 requests per minute per IP (prevents brute force).
// General API: max 100 requests per minute per IP.
const rateLimit = require('express-rate-limit');

const skipPreflight = (req) => req.method === 'OPTIONS';

// Dokku/nginx sends X-Forwarded-For; disable strict validation (use app.set('trust proxy', 1) in app.js).
const dokkuValidate = {
  xForwardedForHeader: false,
  trustProxy: false,
};

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many attempts. Please wait 1 minute.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  validate: dokkuValidate,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  validate: dokkuValidate,
});

module.exports = { authLimiter, apiLimiter };
