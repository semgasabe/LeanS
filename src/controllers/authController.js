// src/controllers/authController.js
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { TENANT_ID } = require('../config/env');
const prisma = require('../config/database');

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    // Frontend and API are on different subdomains in DeployRocks.
    // SameSite=None is required so browser sends refresh cookie cross-site.
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body, TENANT_ID);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());

  res.status(201).json({ user, accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());

  res.json({ user, accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token provided', code: 'UNAUTHORIZED' });
  }

  const { accessToken } = await authService.refresh(token);
  res.json({ accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(token);

  res.clearCookie('refreshToken', refreshCookieOptions());
  res.json({ message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      locationId: true,
      tenantId: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.clearCookie('refreshToken', refreshCookieOptions());
    return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  res.json({ user });
});

// NEW: Email verification
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await authService.verifyEmail(token);
  res.json(result);
});

// NEW: Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.json(result);
});

// NEW: Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const result = await authService.resetPassword(token, password);
  res.json(result);
});

module.exports = { 
  register, 
  login, 
  refresh, 
  logout, 
  me, 
  verifyEmail, 
  forgotPassword, 
  resetPassword 
};