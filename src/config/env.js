// Validates required environment variables on startup.
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_REFRESH_SECRET;

if (!process.env.DATABASE_URL) {
  console.error('[STARTUP ERROR] Missing DATABASE_URL');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('[STARTUP ERROR] Missing JWT_SECRET_KEY (or JWT_SECRET)');
  process.exit(1);
}

if (!JWT_REFRESH_SECRET) {
  console.error('[STARTUP ERROR] Missing JWT_REFRESH_SECRET_KEY (or JWT_REFRESH_SECRET)');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('[STARTUP ERROR] JWT secret must be at least 32 characters long.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'production';
const TENANT_ID = parseInt(process.env.TENANT_ID || '1', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const PRODUCTION_CORS_DEFAULTS = [
  'https://semgasabe-leanstock-frontend.kazi.rocks',
  'https://semgasabe-leanstock.kazi.rocks',
];

const DEV_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function buildCorsOrigins() {
  if (process.env.CORS_ORIGINS) {
    const fromEnv = process.env.CORS_ORIGINS.split(',')
      .map((o) => o.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    if (NODE_ENV !== 'production' || process.env.ENVIRONMENT === 'development') {
      return [...new Set([...fromEnv, ...DEV_CORS_ORIGINS])];
    }
    return fromEnv;
  }
  const origins = new Set([
    FRONTEND_URL,
    ...(NODE_ENV === 'production' ? PRODUCTION_CORS_DEFAULTS : []),
    'http://localhost:3000',
    'http://localhost:5173',
  ]);
  return [...origins];
}

const CORS_ORIGINS = buildCorsOrigins();

console.log(`[Startup] PORT=${PORT} NODE_ENV=${NODE_ENV} TENANT_ID=${TENANT_ID}`);
console.log(`[Startup] DATABASE_URL set=${Boolean(process.env.DATABASE_URL)} REDIS_URL set=${Boolean(process.env.REDIS_URL)}`);
console.log(`[Startup] CORS_ORIGINS=${CORS_ORIGINS.join(', ')}`);

module.exports = {
  PORT,
  NODE_ENV,
  ENVIRONMENT: process.env.ENVIRONMENT || NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  REDIS_URL: process.env.REDIS_URL || null,
  TENANT_ID,
  DECAY_THRESHOLD_DAYS: parseInt(process.env.DECAY_THRESHOLD_DAYS, 10) || 30,
  DECAY_PERCENT: parseInt(process.env.DECAY_PERCENT, 10) || 10,
  DECAY_MAX_PERCENT: parseInt(process.env.DECAY_MAX_PERCENT, 10) || 50,
  CORS_ORIGINS,
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || process.env.EMAIL_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || 'noreply@leanstock.com',
  FRONTEND_URL,
  RESERVATION_TTL_SECONDS: parseInt(process.env.RESERVATION_TTL_SECONDS, 10) || 600,
};
