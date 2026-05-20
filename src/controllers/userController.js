// src/controllers/userController.js
const { z } = require('zod');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaginationParams, buildCursorQuery, buildPaginationResult } = require('../utils/pagination');

// Archived users get this email suffix (see deleteUser); keep in sync with list filter.
const ARCHIVED_EMAIL_SUFFIX = '@deleted.local';

const listUsers = asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePaginationParams(req.query);
  const where = {
    tenantId: req.user.tenantId,
    NOT: { email: { endsWith: ARCHIVED_EMAIL_SUFFIX } },
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
  if (existing.email.endsWith(ARCHIVED_EMAIL_SUFFIX)) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

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
  });
  if (!existing) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  if (existing.id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account', code: 'SELF_DELETE' });
  }
  if (existing.email.endsWith(ARCHIVED_EMAIL_SUFFIX)) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

  // Always archive user (soft-delete) to avoid foreign-key failures in production data.
  const archivedEmail = `deleted_${existing.id}_${Date.now()}${ARCHIVED_EMAIL_SUFFIX}`;
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({ where: { userId: existing.id } });
    await tx.user.update({
      where: { id: existing.id },
      data: {
        email: archivedEmail,
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

  res.status(200).json({ message: 'User archived', code: 'USER_ARCHIVED' });
});

module.exports = { listUsers, updateUser, deleteUser };
