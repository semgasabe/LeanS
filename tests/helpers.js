// tests/helpers.js
// Shared test helpers. Mocks Prisma so tests run without a real database.

jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  stockMovement: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  purchaseOrder: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  // $transaction: runs the callback with a mock tx object
  $transaction: jest.fn((fn) =>
    fn({
      inventory: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ quantity: 5 }),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      stockMovement: { create: jest.fn(), createMany: jest.fn() },
      purchaseOrder: { update: jest.fn() },
    })
  ),
  $disconnect: jest.fn(),
}));

// Redis is optional - mock it as null so locks are skipped in tests
jest.mock('../src/config/redis', () => null);

// Audit service - mock so tests don't worry about it
jest.mock('../src/services/auditService', () => ({ log: jest.fn() }));

// Set env vars before anything loads
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-long-enough-here';
process.env.TENANT_ID = 'tenant_test';
process.env.DATABASE_URL = 'postgresql://test';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.DECAY_THRESHOLD_DAYS = '30';
process.env.DECAY_PERCENT = '10';
process.env.DECAY_MAX_PERCENT = '50';

const jwt = require('jsonwebtoken');

function makeToken(overrides = {}) {
  return jwt.sign(
    {
      userId: 'user1',
      role: 'MANAGER',
      tenantId: 'tenant_test',
      email: 'test@test.com',
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function makeAdminToken() {
  return makeToken({ role: 'ADMIN' });
}

function makeStaffToken() {
  return makeToken({ role: 'STAFF' });
}

module.exports = { makeToken, makeAdminToken, makeStaffToken };
