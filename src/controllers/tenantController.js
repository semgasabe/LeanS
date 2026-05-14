// src/controllers/tenantController.js
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// Получить информацию о текущем tenant
const getMyTenant = asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.user.tenantId },
    include: {
      users: { select: { id: true, email: true, name: true, role: true } },
      products: { take: 10 },
      locations: true
    }
  });
  
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
  }
  
  res.json({ tenant });
});

// Получить все audit логи текущего tenant
const getAuditLogs = asyncHandler(async (req, res) => {
  const { limit, cursor } = require('../utils/pagination').parsePaginationParams(req.query);
  
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      user: { select: { id: true, email: true, name: true } }
    }
  });
  
  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;
  
  res.json({
    data: logs,
    pagination: { nextCursor, hasMore: !!nextCursor }
  });
});

// Создать новый tenant (только для ADMIN)
const createTenant = asyncHandler(async (req, res) => {
  const { name, id } = req.body;
  
  const tenant = await prisma.tenant.create({
    data: {
      id: id || undefined,
      name: name,
    }
  });
  
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: req.user.userId,
      action: 'CREATE_TENANT',
      tableName: 'Tenant',
      recordId: tenant.id,
      newValues: { name: tenant.name }
    }
  });
  
  res.status(201).json({ tenant });
});

module.exports = { getMyTenant, getAuditLogs, createTenant };