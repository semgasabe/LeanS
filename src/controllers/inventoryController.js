// src/controllers/inventoryController.js
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');
const inventoryService = require('../services/inventoryService');

const listInventory = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const tenantId = req.user.tenantId;

  const where = {
    tenantId,
    ...(req.query.locationId && { locationId: req.query.locationId }),
    ...(req.query.deadStock === 'true' && { daysInInventory: { gt: 30 } }),
  };

  const items = await prisma.inventory.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true, price: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    ...buildCursorQuery(cursor, limit),
  });

  res.json(buildPaginationResult(items, limit));
});

const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await prisma.inventory.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      product: { select: { id: true, name: true, sku: true, price: true } },
      location: { select: { id: true, name: true } },
    },
  });
  if (!item) {
    return res.status(404).json({ error: 'Inventory record not found', code: 'NOT_FOUND' });
  }
  res.json(item);
});

const createInventory = asyncHandler(async (req, res) => {
  const schema = z.object({
    productId: z.string().min(1),
    locationId: z.string().min(1),
    quantity: z.number().int().min(0).default(0),
    minQuantity: z.number().int().min(0).default(10),
  });
  const data = schema.parse(req.body);

  const product = await prisma.product.findFirst({
    where: { id: data.productId, tenantId: req.user.tenantId },
  });
  if (!product) {
    return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
  }

  const location = await prisma.location.findFirst({
    where: { id: data.locationId, tenantId: req.user.tenantId },
  });
  if (!location) {
    return res.status(404).json({ error: 'Location not found', code: 'NOT_FOUND' });
  }

  const item = await prisma.inventory.create({
    data: { ...data, tenantId: req.user.tenantId },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      location: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(item);
});

const recordMovement = asyncHandler(async (req, res) => {
  const result = await inventoryService.recordMovement(req.params.id, req.body, req.user);
  res.status(201).json(result);
});

const getMovements = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);

  const inv = await prisma.inventory.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!inv) {
    return res.status(404).json({ error: 'Inventory record not found', code: 'NOT_FOUND' });
  }

  const items = await prisma.stockMovement.findMany({
    where: { inventoryId: req.params.id },
    orderBy: { createdAt: 'desc' },
    ...buildCursorQuery(cursor, limit),
  });

  res.json(buildPaginationResult(items, limit));
});

const transferStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.transferStock(req.body, req.user);
  res.json(result);
});

const getLowStockAlerts = asyncHandler(async (req, res) => {
  const allItems = await prisma.inventory.findMany({
    where: { tenantId: req.user.tenantId, quantity: { gt: 0 } },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { quantity: 'asc' },
  });

  const lowStock = allItems.filter((item) => item.quantity <= item.minQuantity);

  res.json({ data: lowStock, total: lowStock.length });
});

module.exports = {
  listInventory,
  getInventoryItem,
  createInventory,
  recordMovement,
  getMovements,
  transferStock,
  getLowStockAlerts,
};