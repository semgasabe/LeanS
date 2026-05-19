// Redis client for BullMQ, locks, and reservations.
const IORedis = require('ioredis');

let redis = null;

if (process.env.REDIS_URL) {
  redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.connect().catch((err) => {
    console.error('[Redis] Initial connect failed:', err.message);
  });
} else {
  console.warn('[Redis] REDIS_URL not set — queue workers and reservations disabled');
}

module.exports = redis;
