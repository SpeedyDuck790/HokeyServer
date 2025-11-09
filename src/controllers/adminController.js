const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

class AdminController {
  /**
   * Check if user is site admin
   */
  async checkSiteAdmin(userId) {
    const user = await User.findById(userId);
    if (!user || !user.profile.badges.includes('site-admin')) {
      throw new Error('Access denied: Site Admin privileges required');
    }
    return user;
  }

  /**
   * Assign badge to user
   */
  async assignBadge(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { username, badge } = req.body;
      
      if (!username || !badge) {
        return res.status(400).json({
          success: false,
          error: 'Username and badge are required'
        });
      }
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Check if user already has the badge
      if (targetUser.profile.badges.includes(badge)) {
        return res.status(400).json({
          success: false,
          error: 'User already has this badge'
        });
      }
      
      targetUser.profile.badges.push(badge);
      await targetUser.save();
      
      res.status(200).json({
        success: true,
        message: `Badge "${badge}" assigned to ${username}`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Assign badge error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove badge from user
   */
  async removeBadge(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { username, badge } = req.body;
      
      if (!username || !badge) {
        return res.status(400).json({
          success: false,
          error: 'Username and badge are required'
        });
      }
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      targetUser.profile.badges = targetUser.profile.badges.filter(b => b !== badge);
      await targetUser.save();
      
      res.status(200).json({
        success: true,
        message: `Badge "${badge}" removed from ${username}`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Remove badge error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete user (Site Admin only)
   */
  async deleteUser(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { userId } = req.params;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Prevent deleting other site admins
      if (user.profile.badges.includes('site-admin') && userId !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete other site admins'
        });
      }
      
      // Delete user's messages
      await Message.deleteMany({ userId: user._id });
      
      // Remove user from all friends lists
      await User.updateMany(
        { friends: user._id },
        { $pull: { friends: user._id } }
      );
      
      // Delete the user
      await User.findByIdAndDelete(userId);
      
      res.status(200).json({
        success: true,
        message: `User ${user.username} has been deleted`
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete room (Site Admin only)
   */
  async deleteRoom(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { roomId } = req.params;
      
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }
      
      // Prevent deleting the global room
      if (room.name === 'global') {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete the global room'
        });
      }
      
      // Delete all messages in the room
      await Message.deleteMany({ room: room.name });
      
      // Get all users with roles in this room before deletion
      const usersWithRoles = await User.find({ 'roomRoles.roomId': room._id });
      
      // Remove room roles from users and clean up badges
      for (const user of usersWithRoles) {
        // Remove the room role
        user.roomRoles = user.roomRoles.filter(r => !r.roomId.equals(room._id));
        
        // Check if user still has any admin roles
        const hasAdminRoles = user.roomRoles.some(r => r.role === 'admin');
        if (!hasAdminRoles) {
          user.profile.badges = user.profile.badges.filter(b => b !== 'chat-admin');
        }
        
        // Check if user still has any moderator roles
        const hasModRoles = user.roomRoles.some(r => r.role === 'moderator');
        if (!hasModRoles) {
          user.profile.badges = user.profile.badges.filter(b => b !== 'chat-mod');
        }
        
        await user.save();
      }
      
      // Delete the room
      await Room.findByIdAndDelete(roomId);
      
      res.status(200).json({
        success: true,
        message: `Room "${room.name}" has been deleted`
      });
    } catch (error) {
      console.error('Delete room error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Assign room role (admin or moderator)
   */
  async assignRoomRole(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { username, roomName, role } = req.body;
      
      if (!username || !roomName || !role) {
        return res.status(400).json({
          success: false,
          error: 'Username, roomName, and role are required'
        });
      }
      
      if (!['admin', 'moderator'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Role must be "admin" or "moderator"'
        });
      }
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const room = await Room.findOne({ name: roomName });
      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }
      
      // Check if user already has a role in this room
      const existingRole = targetUser.roomRoles.find(r => r.roomName === roomName);
      if (existingRole) {
        existingRole.role = role;
        existingRole.grantedAt = new Date();
        existingRole.grantedBy = req.userId;
      } else {
        targetUser.roomRoles.push({
          roomId: room._id,
          roomName: roomName,
          role: role,
          grantedBy: req.userId
        });
      }
      
      // Add appropriate badge if not present
      if (role === 'admin' && !targetUser.profile.badges.includes('chat-admin')) {
        targetUser.profile.badges.push('chat-admin');
      } else if (role === 'moderator' && !targetUser.profile.badges.includes('chat-mod')) {
        targetUser.profile.badges.push('chat-mod');
      }
      
      await targetUser.save();
      
      res.status(200).json({
        success: true,
        message: `${username} is now ${role} of "${roomName}"`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Assign room role error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove room role
   */
  async removeRoomRole(req, res) {
    try {
      await this.checkSiteAdmin(req.userId);
      
      const { username, roomName } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      targetUser.roomRoles = targetUser.roomRoles.filter(r => r.roomName !== roomName);
      
      // Remove badges if user has no more roles of that type
      const hasAdminRoles = targetUser.roomRoles.some(r => r.role === 'admin');
      const hasModRoles = targetUser.roomRoles.some(r => r.role === 'moderator');
      
      if (!hasAdminRoles) {
        targetUser.profile.badges = targetUser.profile.badges.filter(b => b !== 'chat-admin');
      }
      if (!hasModRoles) {
        targetUser.profile.badges = targetUser.profile.badges.filter(b => b !== 'chat-mod');
      }
      
      await targetUser.save();
      
      res.status(200).json({
        success: true,
        message: `Removed ${username}'s role in "${roomName}"`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Remove room role error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
