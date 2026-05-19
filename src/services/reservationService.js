const redis = require('../config/redis');
const prisma = require('../config/database');
const { RESERVATION_TTL_SECONDS } = require('../config/env');

function reservationKey(tenantId, productId) {
  return `reservation:${tenantId}:${productId}`;
}

async function getTotalAvailable(productId, tenantId) {
  const rows = await prisma.inventory.findMany({
    where: { productId, tenantId },
    select: { quantity: true },
  });
  return rows.reduce((sum, r) => sum + r.quantity, 0);
}

async function getReservedQuantity(tenantId, productId) {
  if (!redis) return 0;
  const raw = await redis.get(reservationKey(tenantId, productId));
  return parseInt(raw || '0', 10);
}

async function reserveStock({ productId, quantity, tenantId, ttlSeconds }) {
  if (!redis) {
    const err = new Error('Reservation service unavailable (Redis not configured)');
    err.status = 503;
    err.code = 'REDIS_UNAVAILABLE';
    throw err;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const ttl = ttlSeconds || RESERVATION_TTL_SECONDS;
  const key = reservationKey(tenantId, productId);
  const available = await getTotalAvailable(productId, tenantId);
  const reserved = await getReservedQuantity(tenantId, productId);

  if (available - reserved < quantity) {
    const err = new Error(
      `Insufficient stock. Available: ${available - reserved}, requested: ${quantity}`
    );
    err.status = 400;
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const newReserved = await redis.incrby(key, quantity);
  await redis.expire(key, ttl);

  return {
    productId,
    reservedQuantity: quantity,
    totalReserved: newReserved,
    availableStock: available,
    availableAfterReservation: available - newReserved,
    ttlSeconds: ttl,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
}

async function getReservationStatus(productId, tenantId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const reserved = await getReservedQuantity(tenantId, productId);
  const available = await getTotalAvailable(productId, tenantId);
  let ttl = null;
  if (redis) {
    const key = reservationKey(tenantId, productId);
    const ttlVal = await redis.ttl(key);
    ttl = ttlVal > 0 ? ttlVal : null;
  }

  return {
    productId,
    productName: product.name,
    sku: product.sku,
    totalStock: available,
    reservedQuantity: reserved,
    availableQuantity: Math.max(0, available - reserved),
    ttlSeconds: ttl,
    active: reserved > 0,
    redisAvailable: Boolean(redis),
  };
}

module.exports = { reserveStock, getReservationStatus };
