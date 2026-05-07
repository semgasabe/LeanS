// src/controllers/authController.js
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { TENANT_ID } = require('../config/env');

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body, TENANT_ID);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ user, accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

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

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
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