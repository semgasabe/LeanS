// src/config/redis.js
const IORedis = require('ioredis');

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,  // ← BullMQ требует null
  enableReadyCheck: false,
});

module.exports = redis;