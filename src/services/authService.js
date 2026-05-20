// src/services/authService.js
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

// Fallback when tenantId is not explicitly provided.
function getTenantNameFromEmail(email) {
  const domain = email.split('@')[1];
  return `Company_${domain}`;
}

async function register(data, tenantId, currentUser) {
  const validated = registerSchema.parse(data);

  let tenant = null;

  // In production DeployRocks setup we run single-tenant app per deployment.
  // Respect tenantId from env/controller to avoid unexpected "domain-based" tenant switching.
  if (Number.isInteger(tenantId) && tenantId > 0) {
    tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: `Tenant_${tenantId}`,
          createdAt: new Date(),
        },
      });
      console.log(`✅ New tenant created from TENANT_ID: ${tenant.name} (ID: ${tenant.id})`);
    }
  } else {
    tenant = await prisma.tenant.findFirst({
      where: { name: getTenantNameFromEmail(validated.email) },
    });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: getTenantNameFromEmail(validated.email),
          createdAt: new Date(),
        },
      });
      console.log(`✅ New tenant created: ${tenant.name} (ID: ${tenant.id})`);
    }
  }

  // Проверка на ADMIN (только первый ADMIN может создать другого ADMIN)
  if (validated.role === 'ADMIN') {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN', tenantId: tenant.id }
    });
    
    if (existingAdmin && (!currentUser || currentUser.role !== 'ADMIN')) {
      const err = new Error('Only existing ADMIN can create new ADMIN users');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  // Проверка email
  const existing = await prisma.user.findUnique({ 
    where: { email: validated.email } 
  });
  
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    err.code = 'EMAIL_CONFLICT';
    throw err;
  }

  const hashed = await bcrypt.hash(validated.password, 12);
  
  const verificationToken = crypto.randomUUID();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email: validated.email,
      password: hashed,
      name: validated.name,
      role: validated.role,
      tenantId: tenant.id,
      emailVerified: true, // Временно для теста
      verificationToken,
      verificationExpires,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'REGISTER',
      tableName: 'User',
      recordId: user.id,
      newValues: { email: user.email, role: user.role, name: user.name }
    }
  });

  // Отправка email в очередь
  await emailQueue.add('send-verification', {
    type: 'send-verification',
    email: user.email,
    token: verificationToken,
    name: user.name,
  });

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

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'VERIFY_EMAIL',
      tableName: 'User',
      recordId: user.id,
      newValues: { emailVerified: true }
    }
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

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      tableName: 'User',
      recordId: user.id,
      newValues: { email: user.email, loginAt: new Date().toISOString() }
    }
  });

  const { password: _, tenantId: __, verificationToken: ___, verificationExpires: ____, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpires },
  });

  await emailQueue.add('send-password-reset', {
    type: 'send-password-reset',
    email: user.email,
    token: resetToken,
    name: user.name,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'FORGOT_PASSWORD',
      tableName: 'User',
      recordId: user.id,
      newValues: { resetRequestedAt: new Date().toISOString() }
    }
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

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'RESET_PASSWORD',
      tableName: 'User',
      recordId: user.id,
      newValues: { passwordChangedAt: new Date().toISOString() }
    }
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

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'REFRESH_TOKEN',
      tableName: 'User',
      recordId: user.id,
      newValues: { refreshedAt: new Date().toISOString() }
    }
  });

  return { accessToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (stored) {
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
    
    if (user) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'LOGOUT',
          tableName: 'User',
          recordId: user.id,
          newValues: { logoutAt: new Date().toISOString() }
        }
      });
    }
  }
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