const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

class ModerationController {
  /**
   * Check if user has moderation privileges for a room
   */
  async checkModeratorPermission(userId, roomName) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Site admins have all permissions
    if (user.profile.badges.includes('site-admin')) {
      return { user, level: 'site-admin' };
    }
    
    // Check room-specific roles
    const roomRole = user.roomRoles.find(r => r.roomName === roomName);
    if (roomRole && (roomRole.role === 'admin' || roomRole.role === 'moderator')) {
      return { user, level: roomRole.role };
    }
    
    throw new Error('Access denied: Moderator privileges required for this room');
  }

  /**
   * Check if user has chat admin privileges for a room
   */
  async checkChatAdminPermission(userId, roomName) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Site admins have all permissions
    if (user.profile.badges.includes('site-admin')) {
      return user;
    }
    
    // Check room-specific admin role
    const roomRole = user.roomRoles.find(r => r.roomName === roomName);
    if (roomRole && roomRole.role === 'admin') {
      return user;
    }
    
    throw new Error('Access denied: Chat Admin privileges required for this room');
  }

  /**
   * Delete message (Moderator action)
   */
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { room } = req.body;
      
      if (!room) {
        return res.status(400).json({
          success: false,
          error: 'Room name is required'
        });
      }
      
      // Check moderator permission
      await this.checkModeratorPermission(req.userId, room);
      
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }
      
      if (message.room !== room) {
        return res.status(403).json({
          success: false,
          error: 'Message not in specified room'
        });
      }
      
      await Message.findByIdAndDelete(messageId);
      
      // Emit socket event to remove message from all clients
      const io = req.app.get('io');
      if (io) {
        io.to(room).emit('message deleted', { messageId });
      }
      
      res.status(200).json({
        success: true,
        message: 'Message deleted'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ban user from room (Chat Admin action)
   */
  async banUser(req, res) {
    try {
      const { username, roomName, duration } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      // Check chat admin permission
      await this.checkChatAdminPermission(req.userId, roomName);
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Prevent banning site admins or chat admins
      if (targetUser.profile.badges.includes('site-admin')) {
        return res.status(403).json({
          success: false,
          error: 'Cannot ban site admins'
        });
      }
      
      const roomRole = targetUser.roomRoles.find(r => r.roomName === roomName);
      if (roomRole && roomRole.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Cannot ban chat admins'
        });
      }
      
      const room = await Room.findOne({ name: roomName });
      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }
      
      // Add ban to room
      const banEntry = {
        userId: targetUser._id,
        bannedBy: req.userId,
        bannedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null
      };
      
      if (!room.bannedUsers) {
        room.bannedUsers = [];
      }
      
      // Remove existing ban if any
      room.bannedUsers = room.bannedUsers.filter(b => !b.userId.equals(targetUser._id));
      room.bannedUsers.push(banEntry);
      
      await room.save();
      
      // Kick user from room via socket
      const io = req.app.get('io');
      if (io) {
        io.to(roomName).emit('user banned', { 
          username: targetUser.username,
          roomName,
          message: duration ? `Banned for ${duration} hours` : 'Permanently banned'
        });
      }
      
      res.status(200).json({
        success: true,
        message: `${username} has been banned from "${roomName}"`,
        data: { duration }
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Unban user from room
   */
  async unbanUser(req, res) {
    try {
      const { username, roomName } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      // Check chat admin permission
      await this.checkChatAdminPermission(req.userId, roomName);
      
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
      
      // Remove ban
      if (room.bannedUsers) {
        room.bannedUsers = room.bannedUsers.filter(b => !b.userId.equals(targetUser._id));
        await room.save();
      }
      
      res.status(200).json({
        success: true,
        message: `${username} has been unbanned from "${roomName}"`
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Kick user from room (temporary removal)
   */
  async kickUser(req, res) {
    try {
      const { username, roomName } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      // Check moderator permission
      await this.checkModeratorPermission(req.userId, roomName);
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Prevent kicking admins
      if (targetUser.profile.badges.includes('site-admin')) {
        return res.status(403).json({
          success: false,
          error: 'Cannot kick site admins'
        });
      }
      
      // Emit socket event to kick user
      const io = req.app.get('io');
      if (io) {
        io.to(roomName).emit('user kicked', { 
          username: targetUser.username,
          roomName
        });
      }
      
      res.status(200).json({
        success: true,
        message: `${username} has been kicked from "${roomName}"`
      });
    } catch (error) {
      console.error('Kick user error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Assign moderator (Chat Admin only)
   */
  async assignModerator(req, res) {
    try {
      const { username, roomName } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      // Check chat admin permission
      await this.checkChatAdminPermission(req.userId, roomName);
      
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
        if (existingRole.role === 'moderator') {
          return res.status(400).json({
            success: false,
            error: 'User is already a moderator of this room'
          });
        }
        if (existingRole.role === 'admin') {
          return res.status(400).json({
            success: false,
            error: 'User is already an admin of this room'
          });
        }
      } else {
        // Add moderator role
        targetUser.roomRoles.push({
          roomId: room._id,
          roomName: roomName,
          role: 'moderator',
          grantedBy: req.userId
        });
        
        // Add chat-mod badge if not present
        if (!targetUser.profile.badges.includes('chat-mod')) {
          targetUser.profile.badges.push('chat-mod');
        }
        
        await targetUser.save();
      }
      
      res.status(200).json({
        success: true,
        message: `${username} is now a moderator of "${roomName}"`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Assign moderator error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove moderator (Chat Admin only)
   */
  async removeModerator(req, res) {
    try {
      const { username, roomName } = req.body;
      
      if (!username || !roomName) {
        return res.status(400).json({
          success: false,
          error: 'Username and roomName are required'
        });
      }
      
      // Check chat admin permission
      await this.checkChatAdminPermission(req.userId, roomName);
      
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Remove room role
      targetUser.roomRoles = targetUser.roomRoles.filter(r => r.roomName !== roomName);
      
      // Remove chat-mod badge if user has no more moderator roles
      const hasOtherModRoles = targetUser.roomRoles.some(r => r.role === 'moderator');
      if (!hasOtherModRoles) {
        targetUser.profile.badges = targetUser.profile.badges.filter(b => b !== 'chat-mod');
      }
      
      await targetUser.save();
      
      res.status(200).json({
        success: true,
        message: `Removed ${username}'s moderator role in "${roomName}"`,
        data: { user: targetUser }
      });
    } catch (error) {
      console.error('Remove moderator error:', error);
      res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ModerationController();
