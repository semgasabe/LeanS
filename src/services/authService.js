const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { z } = require('zod');
const { emailQueue } = require('../jobs/emailQueue');

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional().default('STAFF'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

function makeTokenPayload(user) {
  return { 
    userId: user.id, 
    role: user.role, 
    email: user.email,
    tenantId: user.tenantId   
  };
}

async function register(data, tenantId) {
  const validated = registerSchema.parse(data);

  const existing = await prisma.user.findUnique({ where: { email: validated.email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    err.code = 'EMAIL_CONFLICT';
    throw err;
  }

  const hashed = await bcrypt.hash(validated.password, 12);
  
  // Generate verification token
  const verificationToken = crypto.randomUUID();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      email: validated.email,
      password: hashed,
      name: validated.name,
      role: validated.role,
      tenantId,
      emailVerified: false,
      verificationToken,
      verificationExpires,
    },
  });

  // Send verification email via queue
  await emailQueue.add('send-verification', {
  type: 'send-verification',
  email: user.email,           
  token: verificationToken,
  name: user.name,
});
console.log(`📧 Verification token for ${user.email}: ${verificationToken}`);

  const payload = makeTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiry },
  });

  const { password: _, tenantId: __, verificationToken: ___, verificationExpires: ____, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

async function verifyEmail(token) {
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
  });

  return { message: 'Email verified successfully' };
}

async function login(data) {
  const validated = loginSchema.parse(data);

  const user = await prisma.user.findUnique({ where: { email: validated.email } });
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Check if email is verified
  if (!user.emailVerified) {
    const err = new Error('Please verify your email before logging in');
    err.status = 401;
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  const match = await bcrypt.compare(validated.password, user.password);
  if (!match) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const payload = makeTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiry },
  });

  const { password: _, tenantId: __, verificationToken: ___, verificationExpires: ____, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    // Don't reveal that user doesn't exist for security reasons
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpires },
  });

  // Send reset email via queue
  await emailQueue.add('send-password-reset', {
    email: user.email,
    token: resetToken,
    name: user.name,
  });

  return { message: 'If an account with that email exists, a reset link has been sent' };
}

async function resetPassword(token, newPassword) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetExpires: null,
    },
  });

  return { message: 'Password reset successfully' };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    const err = new Error('Refresh token is invalid or has been revoked');
    err.status = 401;
    err.code = 'TOKEN_REVOKED';
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 401;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const newPayload = makeTokenPayload(user);
  const accessToken = signAccessToken(newPayload);

  return { accessToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });
}

module.exports = { 
  register, 
  login, 
  refresh, 
  logout, 
  verifyEmail, 
  forgotPassword, 
  resetPassword 
};