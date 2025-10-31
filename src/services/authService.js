const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * Authentication Service
 * Handles user registration, login, and guest management
 */
class AuthService {
  /**
   * Register a new user with email and password
   */
  async register(username, email, password) {
    try {
      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw new Error('Username already taken');
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        throw new Error('Email already registered');
      }
      
      // Create new user
      const user = new User({
        username,
        email: email.toLowerCase(),
        password,
        displayName: username,
        isGuest: false
      });
      
      await user.save();
      
      // Generate token
      const token = generateToken(user._id);
      
      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Login with email/username and password
   */
  async login(identifier, password) {
    try {
      const user = await User.findByCredentials(identifier, password);
      
      // Update last seen
      user.lastSeen = new Date();
      user.lastActivity = new Date();
      user.profile.status = 'online';
      await user.save();
      
      // Generate token
      const token = generateToken(user._id);
      
      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Create a guest user
   */
  async createGuest(username, socketId) {
    try {
      const guestUser = await User.createGuest(username, socketId);
      const token = generateToken(guestUser._id);
      
      return {
        user: guestUser.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Upgrade guest account to full account
   */
  async upgradeGuest(userId, email, password, username) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.isGuest) {
        throw new Error('User is already a full account');
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        throw new Error('Email already registered');
      }
      
      // Upgrade user (with optional username change)
      await user.upgradeToFullAccount(email, password, username);
      
      // Generate new token
      const token = generateToken(user._id);
      
      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Logout user (update status)
   */
  async logout(userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.profile.status = 'offline';
        user.lastSeen = new Date();
        await user.save();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  /**
   * Verify user token and return user
   */
  async verifyUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase(), isGuest: false });
      if (!user) {
        throw new Error('No account found with that email');
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      
      await user.save();
      
      return resetToken;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword) {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Change password for authenticated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
