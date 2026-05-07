// src/services/auditService.js
// Append-only audit log. Called from other services after important changes.
// Never updates or deletes - only creates new records.
const prisma = require('../config/database');

async function log({ tenantId, userId, action, tableName, recordId, oldValues, newValues }) {
  await prisma.auditLog.create({
    data: { tenantId, userId, action, tableName, recordId, oldValues, newValues },
  });
}

module.exports = { log };
