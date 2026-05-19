// Validates required environment variables on startup.
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_REFRESH_SECRET;

const required = [
  'DATABASE_URL',
  'PORT',
  'NODE_ENV',
  'TENANT_ID',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[STARTUP ERROR] Missing required environment variable: ${key}`);
    console.error('Check your .env file. See .env.example for reference.');
    process.exit(1);
  }
}

if (!JWT_SECRET) {
  console.error('[STARTUP ERROR] Missing JWT_SECRET_KEY (or JWT_SECRET).');
  process.exit(1);
}

if (!JWT_REFRESH_SECRET) {
  console.error('[STARTUP ERROR] Missing JWT_REFRESH_SECRET_KEY (or JWT_REFRESH_SECRET).');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('[STARTUP ERROR] JWT secret must be at least 32 characters long.');
  process.exit(1);
}

module.exports = {
  PORT: parseInt(process.env.BACKEND_PORT || process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV,
  ENVIRONMENT: process.env.ENVIRONMENT || process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  TENANT_ID: parseInt(process.env.TENANT_ID, 10),
  DECAY_THRESHOLD_DAYS: parseInt(process.env.DECAY_THRESHOLD_DAYS, 10) || 30,
  DECAY_PERCENT: parseInt(process.env.DECAY_PERCENT, 10) || 10,
  DECAY_MAX_PERCENT: parseInt(process.env.DECAY_MAX_PERCENT, 10) || 50,
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || process.env.EMAIL_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || 'noreply@leanstock.com',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RESERVATION_TTL_SECONDS: parseInt(process.env.RESERVATION_TTL_SECONDS, 10) || 600,
};
