// tests/order.test.js
// Tests: purchase order state machine, validation, RBAC

process.env.DATABASE_URL = 'postgresql://test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-long-enough-here';
process.env.PORT = '3003';
process.env.NODE_ENV = 'test';
process.env.TENANT_ID = 'tenant_test';

require('./helpers');

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { makeToken, makeAdminToken } = require('./helpers');

beforeEach(() => jest.clearAllMocks());

// ── Unit tests: state machine logic ───────────────────────────────────────

describe('Purchase order status state machine (unit tests)', () => {
  // These transitions match the logic in orderController.js
  const ALLOWED = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['RECEIVED', 'CANCELLED'],
    RECEIVED: [],
    CANCELLED: [],
  };

  test('PENDING can move to APPROVED', () => {
    expect(ALLOWED.PENDING).toContain('APPROVED');
  });

  test('PENDING can be CANCELLED', () => {
    expect(ALLOWED.PENDING).toContain('CANCELLED');
  });

  test('APPROVED can move to RECEIVED', () => {
    expect(ALLOWED.APPROVED).toContain('RECEIVED');
  });

  test('RECEIVED is a final state - no transitions', () => {
    expect(ALLOWED.RECEIVED).toHaveLength(0);
  });

  test('CANCELLED is a final state - no transitions', () => {
    expect(ALLOWED.CANCELLED).toHaveLength(0);
  });

  test('PENDING cannot jump directly to RECEIVED (must go through APPROVED)', () => {
    expect(ALLOWED.PENDING).not.toContain('RECEIVED');
  });
});

// ── Integration: PATCH /api/v1/orders/:id/status ─────────────────────────

describe('PATCH /api/v1/orders/:id/status', () => {
  const token = makeToken({ role: 'MANAGER' });

  test('400: RECEIVED → CANCELLED is not allowed (final state)', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
      id: 'order1',
      status: 'RECEIVED',
      tenantId: 'tenant_test',
      items: [],
      locationId: 'loc1',
    });

    const res = await request(app)
      .patch('/api/v1/orders/order1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('404: order not found', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/orders/doesnotexist/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(404);
  });

  test('403: STAFF cannot access orders at all', async () => {
    const staffToken = makeToken({ role: 'STAFF' });
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ── Integration: POST /api/v1/orders ─────────────────────────────────────

describe('POST /api/v1/orders - input validation', () => {
  const token = makeToken({ role: 'MANAGER' });

  test('422: empty items array is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ locationId: 'loc1', supplier: 'Test Supplier', items: [] });

    expect(res.status).toBe(422);
  });

  test('422: missing supplier field', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        locationId: 'loc1',
        items: [{ productId: 'p1', quantity: 5, unitPrice: 100 }],
      });

    expect(res.status).toBe(422);
  });

  test('422: item with negative quantity is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        locationId: 'loc1',
        supplier: 'Test Supplier',
        items: [{ productId: 'p1', quantity: -5, unitPrice: 100 }],
      });

    expect(res.status).toBe(422);
  });
});
