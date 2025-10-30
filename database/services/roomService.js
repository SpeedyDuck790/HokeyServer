const Room = require('../models/Room');
const chatService = require('./chatService');
const crypto = require('crypto');

// Room service to handle room operations (CRUD)
class RoomService {
    constructor() {
        this.defaultRooms = ['global', 'general', 'random'];
    }

    /**
     * Initialize default rooms in the database
     */
    async initializeDefaultRooms() {
        try {
            for (const roomName of this.defaultRooms) {
                const exists = await Room.getRoomByName(roomName);
                if (!exists) {
                    await this.createRoom({
                        name: roomName,
                        description: `Default ${roomName} chat room`,
                        createdBy: 'System'
                    });
                    console.log(`✅ Created default room: ${roomName}`);
                }
            }
        } catch (error) {
            console.error('❌ Error initializing default rooms:', error.message);
        }
    }

    /**
     * Create a new room
     * @param {Object} roomData - The room data
     * @param {string} roomData.name - The room name
     * @param {string} roomData.description - The room description (optional)
     * @param {string} roomData.createdBy - Username of creator (optional)
     * @param {boolean} roomData.isPublic - Whether the room is public (default: true)
     * @param {number} roomData.maxUsers - Maximum users allowed (default: 100)
     * @param {string} roomData.password - Room password (optional)
     * @param {boolean} roomData.persistMessages - Save messages to database (default: true)
     * @returns {Promise<Object>} The created room
     */
    async createRoom(roomData) {
        try {
            const { 
                name, 
                description = '', 
                createdBy = 'Anonymous', 
                isPublic = true, 
                maxUsers = 100,
                password,
                persistMessages = true
            } = roomData;

            // Validate room name
            if (!name || typeof name !== 'string') {
                throw new Error('Room name is required');
            }

            const trimmedName = name.trim();
            
            if (trimmedName.length === 0) {
                throw new Error('Room name cannot be empty');
            }

            if (trimmedName.length > 50) {
                throw new Error('Room name too long (max 50 characters)');
            }

            // Check if room already exists
            const existingRoom = await Room.getRoomByName(trimmedName);
            if (existingRoom) {
                throw new Error('Room with this name already exists');
            }

            // Hash password if provided
            let hashedPassword = null;
            if (password && password.trim()) {
                hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');
            }

            // Create new room
            const newRoom = new Room({
                name: trimmedName,
                description: description.trim(),
                createdBy: createdBy.trim(),
                isPublic,
                maxUsers,
                password: hashedPassword,
                persistMessages,
                activeUsers: [],
                messageCount: 0
            });

            const savedRoom = await newRoom.save();
            console.log(`🏠 Room created: ${trimmedName} by ${createdBy} ${hashedPassword ? '🔒' : ''}`);

            return savedRoom;
        } catch (error) {
            console.error('❌ Error creating room:', error.message);
            throw error;
        }
    }

    /**
     * Get all public rooms
     * @returns {Promise<Array>} Array of public rooms
     */
    async getAllPublicRooms() {
        try {
            const rooms = await Room.getPublicRooms();
            return rooms;
        } catch (error) {
            console.error('❌ Error fetching public rooms:', error.message);
            throw error;
        }
    }

    /**
     * Get room by name
     * @param {string} roomName - The room name
     * @returns {Promise<Object>} The room object
     */
    async getRoomByName(roomName) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }
            return room;
        } catch (error) {
            console.error('❌ Error fetching room:', error.message);
            throw error;
        }
    }

    /**
     * Update room details
     * @param {string} roomName - The room name
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} The updated room
     */
    async updateRoom(roomName, updateData) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            // Update allowed fields
            if (updateData.description !== undefined) {
                room.description = updateData.description.trim();
            }
            if (updateData.isPublic !== undefined) {
                room.isPublic = updateData.isPublic;
            }
            if (updateData.maxUsers !== undefined) {
                room.maxUsers = updateData.maxUsers;
            }

            const updatedRoom = await room.save();
            console.log(`📝 Room updated: ${roomName}`);
            return updatedRoom;
        } catch (error) {
            console.error('❌ Error updating room:', error.message);
            throw error;
        }
    }

    /**
     * Delete a room
     * @param {string} roomName - The room name
     * @returns {Promise<boolean>} Success status
     */
    async deleteRoom(roomName) {
        try {
            // Prevent deletion of default rooms
            if (this.defaultRooms.includes(roomName)) {
                throw new Error('Cannot delete default rooms');
            }

            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            // Delete all messages in the room
            await chatService.clearRoom(roomName);

            // Delete the room
            await Room.deleteOne({ name: roomName });
            console.log(`🗑️ Room deleted: ${roomName}`);
            return true;
        } catch (error) {
            console.error('❌ Error deleting room:', error.message);
            throw error;
        }
    }

    /**
     * Add user to a room
     * @param {string} roomName - The room name
     * @param {string} socketId - The socket ID
     * @param {string} username - The username
     * @returns {Promise<Object>} The updated room
     */
    async addUserToRoom(roomName, socketId, username) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            await room.addUser(socketId, username);
            console.log(`👤 User ${username} joined room: ${roomName}`);
            return room;
        } catch (error) {
            console.error('❌ Error adding user to room:', error.message);
            throw error;
        }
    }

    /**
     * Remove user from a room
     * @param {string} roomName - The room name
     * @param {string} socketId - The socket ID
     * @returns {Promise<Object>} The updated room
     */
    async removeUserFromRoom(roomName, socketId) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            await room.removeUser(socketId);
            console.log(`👤 User left room: ${roomName}`);
            return room;
        } catch (error) {
            console.error('❌ Error removing user from room:', error.message);
            throw error;
        }
    }

    /**
     * Verify room password
     * @param {string} roomName - The room name
     * @param {string} password - The password to verify
     * @returns {Promise<boolean>} Whether password is correct
     */
    async verifyRoomPassword(roomName, password) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            // If room has no password, allow entry
            if (!room.password) {
                return true;
            }

            // Hash the provided password and compare
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            return hashedPassword === room.password;
        } catch (error) {
            console.error('❌ Error verifying password:', error.message);
            return false;
        }
    }

    /**
     * Get active users in a room
     * @param {string} roomName - The room name
     * @returns {Promise<Array>} Array of active usernames
     */
    async getActiveUsers(roomName) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (!room) {
                throw new Error('Room not found');
            }

            return room.getActiveUsernames();
        } catch (error) {
            console.error('❌ Error fetching active users:', error.message);
            throw error;
        }
    }

    /**
     * Increment message count for a room
     * @param {string} roomName - The room name
     */
    async incrementMessageCount(roomName) {
        try {
            const room = await Room.getRoomByName(roomName);
            if (room) {
                await room.incrementMessageCount();
            }
        } catch (error) {
            console.error('❌ Error incrementing message count:', error.message);
        }
    }
}

// Singleton instance
const roomService = new RoomService();
// Export the singleton instance
module.exports = roomService;
