
const { z } = require('zod');
const prisma = require('../config/database');
const { withLock } = require('../utils/redisLock');
const auditService = require('./auditService');

const movementSchema = z.object({
  type: z.enum(['IN', 'SALE', 'ADJUSTMENT', 'DAMAGE']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  note: z.string().optional(),
});

const transferSchema = z.object({
  productId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
});

// Record a stock movement (IN, SALE, ADJUSTMENT, DAMAGE)
// Uses Redis lock per inventory item to prevent concurrent updates
async function recordMovement(inventoryId, data, user) {
  const validated = movementSchema.parse(data);

  // COMPLEXITY_REQ_1: Redis lock prevents two movements on same inventory at once
  return withLock(`movement:${inventoryId}`, async () => {
    return prisma.$transaction(async (tx) => {
      // Fetch inside transaction for consistent read
      const inv = await tx.inventory.findFirst({
        where: { id: inventoryId, tenantId: user.tenantId },
      });

      if (!inv) {
        const err = new Error('Inventory record not found');
        err.status = 404;
        throw err;
      }

      // Outgoing movements cannot reduce stock below 0
      const isOutgoing = ['SALE', 'DAMAGE', 'ADJUSTMENT'].includes(validated.type);
      if (isOutgoing && inv.quantity < validated.quantity) {
        const err = new Error(
          `Not enough stock. Available: ${inv.quantity}, requested: ${validated.quantity}`
        );
        err.status = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      const delta = validated.type === 'IN' ? validated.quantity : -validated.quantity;

      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: { increment: delta } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          inventoryId,
          tenantId: user.tenantId,
          type: validated.type,
          quantity: validated.quantity,
          note: validated.note,
          createdBy: user.userId,
        },
      });

      await auditService.log({
        tenantId: user.tenantId,
        userId: user.userId,
        action: `STOCK_${validated.type}`,
        tableName: 'Inventory',
        recordId: inventoryId,
        oldValues: { quantity: inv.quantity },
        newValues: { quantity: updated.quantity },
      });

      return { movement, newQuantity: updated.quantity };
    });
  });
}

// COMPLEXITY_REQ_1 (continued): Atomic transfer between two locations
// Strategy: Redis distributed lock on sorted pair of inventory IDs (prevents deadlocks)
// then Prisma transaction for atomicity (all-or-nothing).
// This replaces SELECT FOR UPDATE since Prisma does not natively support it
// without raw SQL. Redis lock achieves the same mutual exclusion guarantee.
async function transferStock(data, user) {
  const validated = transferSchema.parse(data);

  if (validated.fromLocationId === validated.toLocationId) {
    const err = new Error('Source and destination locations cannot be the same');
    err.status = 400;
    throw err;
  }

  // Resolve inventory records by productId + locationId + tenantId
  const [fromInv, toInv] = await Promise.all([
    prisma.inventory.findFirst({
      where: {
        productId: validated.productId,
        locationId: validated.fromLocationId,
        tenantId: user.tenantId,
      },
    }),
    prisma.inventory.findFirst({
      where: {
        productId: validated.productId,
        locationId: validated.toLocationId,
        tenantId: user.tenantId,
      },
    }),
  ]);

  if (!fromInv) {
    const err = new Error('Source inventory record not found for this product and location');
    err.status = 404;
    throw err;
  }
  if (!toInv) {
    const err = new Error('Destination inventory record not found for this product and location');
    err.status = 404;
    throw err;
  }

  // Sort IDs so lock key is always the same regardless of request order
  // e.g. transfer(A->B) and transfer(B->A) both lock "A:B" - prevents deadlocks
  const sortedIds = [fromInv.id, toInv.id].sort();
  const lockKey = `transfer:${sortedIds.join(':')}`;

  return withLock(lockKey, async () => {
    return prisma.$transaction(async (tx) => {
      // Re-fetch inside transaction for consistent read under lock
      const fromInvTx = await tx.inventory.findFirst({
        where: { id: fromInv.id, tenantId: user.tenantId },
      });
      const toInvTx = await tx.inventory.findFirst({
        where: { id: toInv.id, tenantId: user.tenantId },
      });

      if (!fromInvTx || !toInvTx) {
        const err = new Error('One or both inventory records not found');
        err.status = 404;
        throw err;
      }

      if (fromInvTx.quantity < validated.quantity) {
        const err = new Error(
          `Not enough stock at source. Available: ${fromInvTx.quantity}, requested: ${validated.quantity}`
        );
        err.status = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      // Deduct from source
      await tx.inventory.update({
        where: { id: fromInv.id },
        data: { quantity: { decrement: validated.quantity } },
      });

      // Add to destination
      await tx.inventory.update({
        where: { id: toInv.id },
        data: { quantity: { increment: validated.quantity } },
      });

      // Record both movements for full audit trail
      await tx.stockMovement.createMany({
        data: [
          {
            inventoryId: fromInv.id,
            tenantId: user.tenantId,
            type: 'TRANSFER_OUT',
            quantity: validated.quantity,
            note: validated.note || 'Stock transfer',
            createdBy: user.userId,
          },
          {
            inventoryId: toInv.id,
            tenantId: user.tenantId,
            type: 'TRANSFER_IN',
            quantity: validated.quantity,
            note: validated.note || 'Stock transfer',
            createdBy: user.userId,
          },
        ],
      });

      await auditService.log({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'STOCK_TRANSFER',
        tableName: 'Inventory',
        recordId: fromInv.id,
        oldValues: { quantity: fromInvTx.quantity },
        newValues: {
          quantity: fromInvTx.quantity - validated.quantity,
          transferredTo: toInv.id,
          fromLocationId: validated.fromLocationId,
          toLocationId: validated.toLocationId,
          productId: validated.productId,
          amount: validated.quantity,
        },
      });

      return {
        message: 'Transfer completed successfully',
        transferred: validated.quantity,
        from: {
          inventoryId: fromInv.id,
          locationId: validated.fromLocationId,
          newQuantity: fromInvTx.quantity - validated.quantity,
        },
        to: {
          inventoryId: toInv.id,
          locationId: validated.toLocationId,
          newQuantity: toInvTx.quantity + validated.quantity,
        },
      };
    });
  });
}

module.exports = { recordMovement, transferStock };
