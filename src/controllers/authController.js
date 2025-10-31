const authService = require('../services/authService');
const { body, validationResult } = require('express-validator');

/**
 * Auth Controller
 * Handles authentication-related requests
 */
class AuthController {
  /**
   * Validation rules for registration
   */
  registerValidation = [
    body('username')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Username must be between 2 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ];

  /**
   * Validation rules for login
   */
  loginValidation = [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];

  /**
   * Register new user
   */
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      const result = await authService.register(username, email, password);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { identifier, password } = req.body;

      const result = await authService.login(identifier, password);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create guest user
   */
  async createGuest(req, res) {
    try {
      const { username } = req.body;
      const socketId = req.body.socketId || null;

      const result = await authService.createGuest(username, socketId);

      res.status(201).json({
        success: true,
        message: 'Guest account created',
        data: result
      });
    } catch (error) {
      console.error('Guest creation error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Upgrade guest to full account
   */
  async upgradeGuest(req, res) {
    try {
      const userId = req.userId;
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      const result = await authService.upgradeGuest(userId, email, password);

      res.status(200).json({
        success: true,
        message: 'Account upgraded successfully',
        data: result
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const userId = req.userId;

      await authService.logout(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Verify current user token
   */
  async verifyToken(req, res) {
    try {
      const userId = req.userId;

      const user = await authService.verifyUser(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const resetToken = await authService.generatePasswordResetToken(email);

      // In production, send this via email
      // For now, return it in response (NOT SECURE - for development only)
      res.status(200).json({
        success: true,
        message: 'Password reset token generated',
        resetToken // Remove this in production!
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
      }

      await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(req, res) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new password are required'
        });
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
