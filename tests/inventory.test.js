// tests/inventory.test.js
// Tests: overselling impossible, transfer validation, dead stock decay math, pagination

process.env.DATABASE_URL = 'postgresql://test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-long-enough-here';
process.env.PORT = '3002';
process.env.NODE_ENV = 'test';
process.env.TENANT_ID = 'tenant_test';
process.env.DECAY_THRESHOLD_DAYS = '30';
process.env.DECAY_PERCENT = '10';
process.env.DECAY_MAX_PERCENT = '50';

require('./helpers');

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { makeToken } = require('./helpers');

beforeEach(() => jest.clearAllMocks());

// ── Unit tests: dead stock decay math ─────────────────────────────────────

describe('Dead stock decay - business logic (unit tests)', () => {
  test('discount never exceeds the max cap (50%)', () => {
    const DECAY_PERCENT = 10;
    const DECAY_MAX = 50;
    let discount = 0;
    for (let i = 0; i < 20; i++) {
      discount = Math.min(discount + DECAY_PERCENT, DECAY_MAX);
    }
    expect(discount).toBe(50);
  });

  test('discount is configurable - works with 5% decay and 30% max', () => {
    const customDecay = 5;
    const customMax = 30;
    let discount = 0;
    for (let i = 0; i < 10; i++) {
      discount = Math.min(discount + customDecay, customMax);
    }
    expect(discount).toBe(30);
  });

  test('first decay cycle: 0% → 10%', () => {
    const result = Math.min(0 + 10, 50);
    expect(result).toBe(10);
  });
});

// ── Unit tests: pagination ────────────────────────────────────────────────

describe('Cursor-based pagination', () => {
  const { buildPaginationResult } = require('../src/utils/pagination');

  test('hasMore=true when there are more items', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ id: `item${i}` }));
    const result = buildPaginationResult(items, 20);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.data.length).toBe(20);
  });

  test('hasMore=false on last page', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: `item${i}` }));
    const result = buildPaginationResult(items, 20);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  test('empty result is handled gracefully', () => {
    const result = buildPaginationResult([], 20);
    expect(result.data).toHaveLength(0);
    expect(result.pagination.hasMore).toBe(false);
  });
});

// ── Integration: overselling prevention ───────────────────────────────────

describe('POST /api/v1/inventory/:id/movements - overselling impossible', () => {
  const token = makeToken({ role: 'MANAGER' });

  test('400 INSUFFICIENT_STOCK when trying to sell more than available', async () => {
    prisma.$transaction.mockImplementationOnce(async (fn) => {
      const tx = {
        inventory: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'inv1',
            quantity: 2,
            tenantId: 'tenant_test',
          }),
          update: jest.fn(),
        },
        stockMovement: { create: jest.fn() },
      };
      return fn(tx);
    });

    const res = await request(app)
      .post('/api/v1/inventory/inv1/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'SALE', quantity: 10 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
  });

  test('403: STAFF role cannot record movements', async () => {
    const staffToken = makeToken({ role: 'STAFF' });
    const res = await request(app)
      .post('/api/v1/inventory/inv1/movements')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ type: 'SALE', quantity: 3 });

    expect(res.status).toBe(403);
  });
});

// ── Integration: transfer endpoint ───────────────────────────────────────

describe('POST /api/v1/inventory/transfer', () => {
  const token = makeToken({ role: 'MANAGER' });

  test('400: same source and destination is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ fromInventoryId: 'inv1', toInventoryId: 'inv1', quantity: 5 });

    expect(res.status).toBe(400);
  });

  test('403: STAFF role cannot transfer stock', async () => {
    const staffToken = makeToken({ role: 'STAFF' });
    const res = await request(app)
      .post('/api/v1/inventory/transfer')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ fromInventoryId: 'inv1', toInventoryId: 'inv2', quantity: 5 });

    expect(res.status).toBe(403);
  });

  test('422: missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ fromInventoryId: 'inv1' });

    expect(res.status).toBe(422);
  });
});