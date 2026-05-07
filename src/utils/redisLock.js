// src/utils/redisLock.js
// Simple Redis distributed lock to prevent race conditions on inventory transfers.
// Two requests trying to transfer the same stock at the same time will be serialized.

const redis = require('../config/redis');

const LOCK_TTL_MS = 5000; // lock expires after 5 seconds (prevents deadlocks)

async function acquireLock(key) {
  if (!redis) return true; // no Redis - skip locking (dev mode)

  const lockKey = `lock:${key}`;
  // SET key value NX PX ttl  - only set if not exists, with expiry
  const result = await redis.set(lockKey, '1', 'NX', 'PX', LOCK_TTL_MS);
  return result === 'OK';
}

async function releaseLock(key) {
  if (!redis) return;
  await redis.del(`lock:${key}`);
}

// Runs a function while holding a distributed lock
async function withLock(key, fn) {
  const acquired = await acquireLock(key);
  if (!acquired) {
    const err = new Error('Resource is locked by another operation. Please retry.');
    err.status = 409;
    throw err;
  }
  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

module.exports = { acquireLock, releaseLock, withLock };
