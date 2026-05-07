// src/routes/auth.routes.js
const router = require('express').Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Rate limited - max 5 per minute per IP
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);

// Email verification - должен быть GET или POST?
router.get('/verify-email/:token', authController.verifyEmail);     // ← метод GET
// ИЛИ
// router.post('/verify-email/:token', authController.verifyEmail); // ← метод POST

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;