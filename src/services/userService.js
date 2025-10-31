const User = require('../models/User');
const crypto = require('crypto');

/**
 * User Service
 * Handles user profile management, friends, blocking, etc.
 */
class UserService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .populate('friends', 'username displayName profile.avatar profile.status lastSeen')
        .populate('friendRequests.from', 'username displayName profile.avatar');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    try {
      const user = await User.findOne({ username })
        .select('username displayName profile createdAt lastSeen role');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update allowed fields
      if (updates.displayName !== undefined) {
        user.displayName = updates.displayName;
      }
      if (updates.bio !== undefined) {
        user.profile.bio = updates.bio;
      }
      if (updates.avatar !== undefined) {
        user.profile.avatar = updates.avatar;
      }
      if (updates.customStatus !== undefined) {
        user.profile.customStatus = updates.customStatus;
      }
      
      await user.save();
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update user status (online, away, dnd, invisible)
   */
  async updateStatus(userId, status) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.profile.status = status;
      user.lastActivity = new Date();
      await user.save();
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update user settings
   */
  async updateSettings(userId, settings) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update settings
      if (settings.notifications) {
        user.settings.notifications = { ...user.settings.notifications, ...settings.notifications };
      }
      if (settings.privacy) {
        user.settings.privacy = { ...user.settings.privacy, ...settings.privacy };
      }
      if (settings.theme) {
        user.settings.theme = settings.theme;
      }
      if (settings.fontSize) {
        user.settings.fontSize = settings.fontSize;
      }
      
      await user.save();
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Send friend request
   */
  async sendFriendRequest(fromUserId, toUsername) {
    try {
      const fromUser = await User.findById(fromUserId);
      const toUser = await User.findOne({ username: toUsername });
      
      if (!toUser) {
        throw new Error('User not found');
      }
      
      if (toUser._id.equals(fromUserId)) {
        throw new Error('Cannot send friend request to yourself');
      }
      
      // Check if already friends
      if (fromUser.friends.includes(toUser._id)) {
        throw new Error('Already friends with this user');
      }
      
      // Check if request already sent
      const existingRequest = toUser.friendRequests.find(req => 
        req.from.equals(fromUserId)
      );
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }
      
      // Check privacy settings
      if (!toUser.settings.privacy.allowFriendRequests) {
        throw new Error('User is not accepting friend requests');
      }
      
      // Add friend request
      toUser.friendRequests.push({ from: fromUserId });
      await toUser.save();
      
      return { success: true, message: 'Friend request sent' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId, fromUserId) {
    try {
      const user = await User.findById(userId);
      const fromUser = await User.findById(fromUserId);
      
      if (!fromUser) {
        throw new Error('User not found');
      }
      
      // Find and remove friend request
      const requestIndex = user.friendRequests.findIndex(req => 
        req.from.equals(fromUserId)
      );
      
      if (requestIndex === -1) {
        throw new Error('Friend request not found');
      }
      
      user.friendRequests.splice(requestIndex, 1);
      
      // Add to friends lists
      await user.addFriend(fromUserId);
      await fromUser.addFriend(userId);
      
      return { success: true, message: 'Friend request accepted' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Reject friend request
   */
  async rejectFriendRequest(userId, fromUserId) {
    try {
      const user = await User.findById(userId);
      
      // Find and remove friend request
      const requestIndex = user.friendRequests.findIndex(req => 
        req.from.equals(fromUserId)
      );
      
      if (requestIndex === -1) {
        throw new Error('Friend request not found');
      }
      
      user.friendRequests.splice(requestIndex, 1);
      await user.save();
      
      return { success: true, message: 'Friend request rejected' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Remove friend
   */
  async removeFriend(userId, friendId) {
    try {
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      
      if (!friend) {
        throw new Error('User not found');
      }
      
      await user.removeFriend(friendId);
      await friend.removeFriend(userId);
      
      return { success: true, message: 'Friend removed' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Block user
   */
  async blockUser(userId, blockUserId) {
    try {
      const user = await User.findById(userId);
      const blockUser = await User.findById(blockUserId);
      
      if (!blockUser) {
        throw new Error('User not found');
      }
      
      if (blockUser._id.equals(userId)) {
        throw new Error('Cannot block yourself');
      }
      
      await user.blockUser(blockUserId);
      
      return { success: true, message: 'User blocked' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Unblock user
   */
  async unblockUser(userId, unblockUserId) {
    try {
      const user = await User.findById(userId);
      await user.unblockUser(unblockUserId);
      
      return { success: true, message: 'User unblocked' };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get user's friends list
   */
  async getFriends(userId) {
    try {
      const user = await User.findById(userId)
        .populate('friends', 'username displayName profile.avatar profile.status lastSeen');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.friends;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get online friends
   */
  async getOnlineFriends(userId) {
    try {
      const user = await User.findById(userId)
        .populate({
          path: 'friends',
          match: {
            'profile.status': { $in: ['online', 'away', 'dnd'] },
            lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
          },
          select: 'username displayName profile.avatar profile.status'
        });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.friends;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get blocked users
   */
  async getBlockedUsers(userId) {
    try {
      const user = await User.findById(userId)
        .populate('blockedUsers', 'username displayName profile.avatar');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.blockedUsers;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Search users by username
   */
  async searchUsers(query, limit = 10) {
    try {
      const users = await User.find({
        username: { $regex: query, $options: 'i' },
        isGuest: false
      })
      .select('username displayName profile.avatar profile.status')
      .limit(limit);
      
      return users;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get Gravatar URL for email
   */
  getGravatarUrl(email, size = 200) {
    const hash = crypto
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  }
  
  /**
   * Set user avatar to Gravatar
   */
  async setGravatarAvatar(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        throw new Error('User not found or no email');
      }
      
      user.profile.avatar = this.getGravatarUrl(user.email);
      await user.save();
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
