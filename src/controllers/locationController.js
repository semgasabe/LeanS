// src/controllers/locationController.js
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
});

const listLocations = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const items = await prisma.location.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { name: 'asc' },
    ...buildCursorQuery(cursor, limit),
  });
  res.json(buildPaginationResult(items, limit));
});

const getLocation = asyncHandler(async (req, res) => {
  const location = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: { inventory: { include: { product: true } } },
  });
  if (!location) return res.status(404).json({ error: 'Location not found', code: 'NOT_FOUND' });
  res.json(location);
});

const createLocation = asyncHandler(async (req, res) => {
  const data = locationSchema.parse(req.body);
  const location = await prisma.location.create({
    data: { ...data, tenantId: req.user.tenantId },
  });
  res.status(201).json(location);
});

const updateLocation = asyncHandler(async (req, res) => {
  const existing = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Location not found', code: 'NOT_FOUND' });

  const data = locationSchema.partial().parse(req.body);
  const location = await prisma.location.update({ where: { id: req.params.id }, data });
  res.json(location);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const existing = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Location not found', code: 'NOT_FOUND' });
  await prisma.location.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = { listLocations, getLocation, createLocation, updateLocation, deleteLocation };
