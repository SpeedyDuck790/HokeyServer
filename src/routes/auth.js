const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireAuth } = require('../middleware/auth');

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Public routes (no auth required)
router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);
router.post('/guest', authController.createGuest);
router.post('/password-reset-request', authController.requestPasswordReset);
router.post('/password-reset', authController.resetPassword);

// Protected routes (auth required)
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verifyToken);
router.post('/upgrade', authenticate, authController.upgradeGuest);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
