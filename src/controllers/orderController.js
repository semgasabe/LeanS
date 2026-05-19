// src/controllers/orderController.js
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');
const auditService = require('../services/auditService');
const { queuePurchaseOrderConfirmation } = require('../services/emailNotifier');

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  locationId: z.string().min(1),
  supplier: z.string().min(1),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
});

const listOrders = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const tenantId = req.user.tenantId;

  const where = {
    tenantId,
    ...(req.query.status && { status: req.query.status }),
    // Managers can only see their own location's orders
    ...(req.user.role === 'MANAGER' && req.user.locationId && {
      locationId: req.user.locationId,
    }),
  };

  const items = await prisma.purchaseOrder.findMany({
    where,
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    ...buildCursorQuery(cursor, limit),
  });

  res.json(buildPaginationResult(items, limit));
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
  res.json(order);
});

const createOrder = asyncHandler(async (req, res) => {
  const data = createOrderSchema.parse(req.body);

  // Verify location belongs to this tenant
  const location = await prisma.location.findFirst({
    where: { id: data.locationId, tenantId: req.user.tenantId },
  });
  if (!location) return res.status(404).json({ error: 'Location not found', code: 'NOT_FOUND' });

  const order = await prisma.purchaseOrder.create({
    data: {
      tenantId: req.user.tenantId,
      locationId: data.locationId,
      supplier: data.supplier,
      createdBy: req.user.userId,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  await auditService.log({
    tenantId: req.user.tenantId, userId: req.user.userId,
    action: 'CREATE_ORDER', tableName: 'PurchaseOrder', recordId: order.id,
    newValues: { supplier: data.supplier, itemCount: data.items.length },
  });

  const creator = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { email: true, name: true },
  });
  if (creator?.email) {
    await queuePurchaseOrderConfirmation({
      order,
      recipientEmail: creator.email,
      recipientName: creator.name,
    });
  }

  res.status(201).json(order);
});

// Valid status transitions - prevents invalid changes
const STATUS_TRANSITIONS = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [], // final state
  CANCELLED: [], // final state
};

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'RECEIVED', 'CANCELLED']) }).parse(req.body);

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });

  const allowed = STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot change status from ${order.status} to ${status}`,
      code: 'INVALID_STATUS_TRANSITION',
    });
  }

  // When order is RECEIVED, automatically add stock to inventory
  if (status === 'RECEIVED') {
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status } });

      for (const item of order.items) {
        // Upsert inventory - create if not exists, update quantity if exists
        const existing = await tx.inventory.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: order.locationId } },
        });

        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: {
              quantity: { increment: item.quantity },
              daysInInventory: 0, // reset decay counter on restock
              discountPct: 0,
              lastRestockedAt: new Date(),
            },
          });
          await tx.stockMovement.create({
            data: {
              inventoryId: existing.id,
              tenantId: req.user.tenantId,
              type: 'IN',
              quantity: item.quantity,
              note: `Purchase order ${order.id} received`,
              createdBy: req.user.userId,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: order.locationId,
              tenantId: req.user.tenantId,
              quantity: item.quantity,
              lastRestockedAt: new Date(),
            },
          });
        }
      }
    });
  } else {
    await prisma.purchaseOrder.update({ where: { id: order.id }, data: { status } });
  }

  const updated = await prisma.purchaseOrder.findUnique({
    where: { id: order.id },
    include: { items: { include: { product: true } } },
  });

  await auditService.log({
    tenantId: req.user.tenantId, userId: req.user.userId,
    action: 'UPDATE_ORDER_STATUS', tableName: 'PurchaseOrder', recordId: order.id,
    oldValues: { status: order.status }, newValues: { status },
  });

  res.json(updated);
});

module.exports = { listOrders, getOrder, createOrder, updateOrderStatus };
