// src/config/database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  omit: {
   
    product: { tenantId: true },
    inventory: { tenantId: true },
    location: { tenantId: true },
    stockMovement: { tenantId: true },
    purchaseOrder: { tenantId: true },
    auditLog: { tenantId: true },
  }
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
