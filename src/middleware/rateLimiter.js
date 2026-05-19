// src/middleware/rateLimiter.js
// Rate limiting using express-rate-limit.
// Auth endpoints: max 5 requests per minute per IP (prevents brute force).
// General API: max 100 requests per minute per IP.
const rateLimit = require('express-rate-limit');

const skipPreflight = (req) => req.method === 'OPTIONS';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many attempts. Please wait 1 minute.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

module.exports = { authLimiter, apiLimiter };
