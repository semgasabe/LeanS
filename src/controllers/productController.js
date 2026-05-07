
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');
const auditService = require('../services/auditService');

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1).toUpperCase(),
  description: z.string().optional(),
  price: z.number().positive(),
});

const listProducts = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const tenantId = req.user.tenantId;

  const where = {
    tenantId,
    ...(req.query.search && {
      OR: [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { sku: { contains: req.query.search, mode: 'insensitive' } },
      ],
    }),
  };

  const items = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    ...buildCursorQuery(cursor, limit),
  });

  res.json(buildPaginationResult(items, limit));
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: { ...data, tenantId: req.user.tenantId },
  });
  await auditService.log({
    tenantId: req.user.tenantId, userId: req.user.userId,
    action: 'CREATE_PRODUCT', tableName: 'Product', recordId: product.id, newValues: data,
  });
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({ where: { id: req.params.id }, data });

  await auditService.log({
    tenantId: req.user.tenantId, userId: req.user.userId,
    action: 'UPDATE_PRODUCT', tableName: 'Product', recordId: product.id,
    oldValues: existing, newValues: data,
  });
  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
