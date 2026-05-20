// src/controllers/userController.js
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');

const listUsers = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const where = {
    tenantId: req.user.tenantId,
    ...(req.query.role && { role: req.query.role }),
  };

  const items = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, locationId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    ...buildCursorQuery(cursor, limit),
  });
  res.json(buildPaginationResult(items, limit));
});

const updateUser = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });

  const schema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
    locationId: z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, name: true, role: true, locationId: true, updatedAt: true },
  });
  res.json(user);
});

const deleteUser = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      movements: { select: { id: true } },
      auditLogs: { select: { id: true } },
      refreshTokens: { select: { id: true } },
    },
  });
  if (!existing) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  if (existing.id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account', code: 'SELF_DELETE' });
  }

  // If user has history references, hard delete will violate foreign keys.
  // In that case we archive the account but keep referential integrity.
  const hasReferences = existing.movements.length > 0 || existing.auditLogs.length > 0;
  if (hasReferences) {
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: existing.id } });
      await tx.user.update({
        where: { id: existing.id },
        data: {
          email: `deleted_${existing.id}@deleted.local`,
          name: 'Deleted User',
          password: '$2a$12$invalid.invalid.invalid.invalid.invalid.invalid.invalid.invalid',
          role: 'STAFF',
          locationId: null,
          emailVerified: false,
          verificationToken: null,
          verificationExpires: null,
          resetToken: null,
          resetExpires: null,
        },
      });
    });

    return res.status(200).json({
      message: 'User archived because related records exist',
      code: 'USER_ARCHIVED',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({ where: { userId: existing.id } });
    await tx.user.delete({ where: { id: existing.id } });
  });

  res.status(204).send();
});

module.exports = { listUsers, updateUser, deleteUser };
