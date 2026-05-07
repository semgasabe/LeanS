// src/config/env.js
// Validates all required environment variables on startup.
// App will crash with a clear error if anything is missing.
require('dotenv').config();

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
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

if (process.env.JWT_SECRET.length < 32) {
  console.error('[STARTUP ERROR] JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  REDIS_URL: process.env.REDIS_URL || null,
  TENANT_ID: parseInt(process.env.TENANT_ID, 10),
  // Dead stock decay config (configurable, not hardcoded)
  DECAY_THRESHOLD_DAYS: parseInt(process.env.DECAY_THRESHOLD_DAYS, 10) || 30,
  DECAY_PERCENT: parseInt(process.env.DECAY_PERCENT, 10) || 10,
  DECAY_MAX_PERCENT: parseInt(process.env.DECAY_MAX_PERCENT, 10) || 50,
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'],
};
