const userService = require('../services/userService');
const { body, validationResult } = require('express-validator');

/**
 * User Controller
 * Handles user profile and social features
 */
class UserController {
  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.userId;
      const user = await userService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      const user = await userService.getUserByUsername(username);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.userId;
      const updates = req.body;

      const user = await userService.updateProfile(userId, updates);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update user status
   */
  async updateStatus(req, res) {
    try {
      const userId = req.userId;
      const { status } = req.body;

      if (!['online', 'away', 'dnd', 'invisible', 'offline'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const user = await userService.updateStatus(userId, status);

      res.status(200).json({
        success: true,
        message: 'Status updated',
        data: { user }
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(req, res) {
    try {
      const userId = req.userId;
      const settings = req.body;

      const user = await userService.updateSettings(userId, settings);

      res.status(200).json({
        success: true,
        message: 'Settings updated',
        data: { user }
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get friend requests
   */
  async getFriendRequests(req, res) {
    try {
      const userId = req.userId;
      const friendRequests = await userService.getFriendRequests(userId);

      res.status(200).json({
        success: true,
        data: friendRequests
      });
    } catch (error) {
      console.error('Get friend requests error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(req, res) {
    try {
      const fromUserId = req.userId;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      const result = await userService.sendFriendRequest(fromUserId, username);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(req, res) {
    try {
      const userId = req.userId;
      const { fromUserId } = req.body;

      if (!fromUserId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await userService.acceptFriendRequest(userId, fromUserId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(req, res) {
    try {
      const userId = req.userId;
      const { fromUserId } = req.body;

      if (!fromUserId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await userService.rejectFriendRequest(userId, fromUserId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Reject friend request error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(req, res) {
    try {
      const userId = req.userId;
      const { friendId } = req.params;

      const result = await userService.removeFriend(userId, friendId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Block user
   */
  async blockUser(req, res) {
    try {
      const userId = req.userId;
      const { blockUserId } = req.body;

      if (!blockUserId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await userService.blockUser(userId, blockUserId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Block user error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Unblock user
   */
  async unblockUser(req, res) {
    try {
      const userId = req.userId;
      const { unblockUserId } = req.params;

      const result = await userService.unblockUser(userId, unblockUserId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Unblock user error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get friends list
   */
  async getFriends(req, res) {
    try {
      const userId = req.userId;
      const friends = await userService.getFriends(userId);

      res.status(200).json(friends);
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(req, res) {
    try {
      const userId = req.userId;
      const friends = await userService.getOnlineFriends(userId);

      res.status(200).json(friends);
    } catch (error) {
      console.error('Get online friends error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(req, res) {
    try {
      const userId = req.userId;
      const blocked = await userService.getBlockedUsers(userId);

      res.status(200).json({
        success: true,
        data: { blocked }
      });
    } catch (error) {
      console.error('Get blocked users error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const users = await userService.searchUsers(q);

      res.status(200).json({
        success: true,
        data: { users }
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Set Gravatar avatar
   */
  async setGravatar(req, res) {
    try {
      const userId = req.userId;
      const user = await userService.setGravatarAvatar(userId);

      res.status(200).json({
        success: true,
        message: 'Avatar set to Gravatar',
        data: { user }
      });
    } catch (error) {
      console.error('Set Gravatar error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UserController();
