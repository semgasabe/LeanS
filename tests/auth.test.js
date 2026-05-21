// tests/auth.test.js
// Unit + integration tests for authentication

process.env.DATABASE_URL = 'postgresql://test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-long-enough-here';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.TENANT_ID = '1';

require('./helpers');

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { makeToken, makeAdminToken, makeStaffToken } = require('./helpers');

beforeEach(() => jest.clearAllMocks());

// ── Unit tests: password hashing ──────────────────────────────────────────

describe('Password security', () => {
  test('bcrypt hash is not equal to plaintext password', async () => {
    const password = 'TestPass123';
    const hashed = await bcrypt.hash(password, 12);
    expect(hashed).not.toBe(password);
    expect(hashed).toMatch(/^\$2[ab]\$/);
  });

  test('bcrypt compare: correct password returns true', async () => {
    const password = 'TestPass123';
    const hashed = await bcrypt.hash(password, 12);
    expect(await bcrypt.compare(password, hashed)).toBe(true);
  });

  test('bcrypt compare: wrong password returns false', async () => {
    const hashed = await bcrypt.hash('CorrectPass123', 12);
    expect(await bcrypt.compare('WrongPass999', hashed)).toBe(false);
  });
});

// ── Unit tests: JWT ───────────────────────────────────────────────────────

describe('JWT token utilities', () => {
  const { signAccessToken, verifyAccessToken, signRefreshToken } = require('../src/utils/jwt');

  test('access token payload is readable after verify', () => {
    const payload = { userId: 'u1', role: 'MANAGER', tenantId: 'tenant_test' };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.role).toBe('MANAGER');
  });

  test('refresh token uses a different secret than access token', () => {
    const payload = { userId: 'u1', role: 'STAFF', tenantId: 'tenant_test' };
    const refreshToken = signRefreshToken(payload);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });

  test('tampered token fails verification', () => {
    const token = signAccessToken({ userId: 'u1' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

// ── Integration: POST /api/v1/auth/register ───────────────────────────────

describe('POST /api/v1/auth/register', () => {
  test('201: valid registration returns user and verification message (no tokens)', async () => {
    prisma.tenant = prisma.tenant || { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() };
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 1, name: 'T' });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'user1',
      email: 'new@test.com',
      name: 'New User',
      role: 'STAFF',
      tenantId: 1,
      emailVerified: false,
      createdAt: new Date(),
    });
    prisma.auditLog.create.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@test.com', password: 'StrongPass123', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body.user.emailVerified).toBe(false);
  });

  test('422: short password is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@test.com', password: 'short', name: 'Test' });

    expect(res.status).toBe(422);
  });

  test('409: duplicate email returns CONFLICT error', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'taken@test.com', password: 'StrongPass123', name: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_CONFLICT');
  });
});

// ── Integration: POST /api/v1/auth/login ─────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  test('401: wrong password returns INVALID_CREDENTIALS', async () => {
    const hashed = await bcrypt.hash('CorrectPass123', 12);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      email: 'user@test.com',
      password: hashed,
      role: 'STAFF',
      tenantId: 'tenant_test',
      emailVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'WrongPass999' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('401: unknown email returns same generic error', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'AnyPass123' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});

// ── Integration: RBAC middleware ──────────────────────────────────────────

describe('Auth middleware & RBAC', () => {
  test('401: no token provided', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
  });

  test('403: STAFF cannot access ADMIN-only /users route', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeStaffToken()}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('403: STAFF cannot delete a product', async () => {
    const res = await request(app)
      .delete('/api/v1/products/someid')
      .set('Authorization', `Bearer ${makeStaffToken()}`);

    expect(res.status).toBe(403);
  });

  test('ADMIN token reaches admin routes', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});