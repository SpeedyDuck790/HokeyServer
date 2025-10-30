const Message = require('../models/Message');

class ChatService {
    constructor() {
        this.maxMessagesPerRoom = 1000; // Limit messages per room for performance
    }

    /**
     * Save a new message to the database
     * @param {Object} messageData - The message data
     * @param {string} messageData.username - The username
     * @param {string} messageData.message - The message content
     * @param {string} messageData.room - The room name (default: 'general')
     * @param {string} messageData.messageType - Type of message (default: 'message')
     * @returns {Promise<Object>} The saved message
     */
    async saveMessage(messageData) {
        try {
            const { username, message, room = 'general', messageType = 'message' } = messageData;

            // Validate input
            if (!username || !message) {
                throw new Error('Username and message are required');
            }

            if (username.length > 50) {
                throw new Error('Username too long (max 50 characters)');
            }

            if (message.length > 500) {
                throw new Error('Message too long (max 500 characters)');
            }

            // Create and save the message
            const newMessage = new Message({
                username: username.trim(),
                message: message.trim(),
                room: room.trim(),
                messageType,
                timestamp: new Date()
            });

            const savedMessage = await newMessage.save();
            console.log(`💾 Message saved: ${username} in ${room}`);

            // Clean up old messages if we exceed the limit
            await this.cleanupOldMessages(room);

            return savedMessage;
        } catch (error) {
            console.error('❌ Error saving message:', error.message);
            throw error;
        }
    }

    /**
     * Get recent messages from a room
     * @param {string} room - The room name (default: 'general')
     * @param {number} limit - Number of messages to retrieve (default: 50)
     * @returns {Promise<Array>} Array of messages
     */
    async getRecentMessages(room = 'general', limit = 50) {
        try {
            const messages = await Message.getRecentMessages(room, limit);
            
            // Reverse to get chronological order (oldest first)
            return messages.reverse();
        } catch (error) {
            console.error('❌ Error fetching messages:', error.message);
            throw error;
        }
    }

    /**
     * Get all messages from a room (for full history)
     * @param {string} room - The room name
     * @returns {Promise<Array>} Array of all messages
     */
    async getAllMessages(room = 'general') {
        try {
            const messages = await Message.find({ room })
                .sort({ timestamp: 1 }) // Chronological order
                .exec();
            
            return messages;
        } catch (error) {
            console.error('❌ Error fetching all messages:', error.message);
            throw error;
        }
    }

    /**
     * Get message statistics for a room
     * @param {string} room - The room name
     * @returns {Promise<Object>} Statistics object
     */
    async getRoomStats(room = 'general') {
        try {
            const totalMessages = await Message.getMessageCount(room);
            const uniqueUsers = await Message.distinct('username', { room });
            
            const oldestMessage = await Message.findOne({ room })
                .sort({ timestamp: 1 })
                .exec();
            
            const newestMessage = await Message.findOne({ room })
                .sort({ timestamp: -1 })
                .exec();

            return {
                totalMessages,
                uniqueUsers: uniqueUsers.length,
                userList: uniqueUsers,
                oldestMessage: oldestMessage?.timestamp,
                newestMessage: newestMessage?.timestamp,
                room
            };
        } catch (error) {
            console.error('❌ Error fetching room stats:', error.message);
            throw error;
        }
    }

    /**
     * Delete old messages if room exceeds the limit
     * @param {string} room - The room name
     */
    async cleanupOldMessages(room = 'general') {
        try {
            const messageCount = await Message.getMessageCount(room);
            
            if (messageCount > this.maxMessagesPerRoom) {
                const excess = messageCount - this.maxMessagesPerRoom;
                
                // Get the oldest messages to delete
                const oldMessages = await Message.find({ room })
                    .sort({ timestamp: 1 })
                    .limit(excess)
                    .select('_id')
                    .exec();
                
                const idsToDelete = oldMessages.map(msg => msg._id);
                
                await Message.deleteMany({ _id: { $in: idsToDelete } });
                
                console.log(`🧹 Cleaned up ${excess} old messages from ${room}`);
            }
        } catch (error) {
            console.error('❌ Error cleaning up messages:', error.message);
        }
    }

    /**
     * Save a system message (user join/leave, etc.)
     * @param {string} message - The system message
     * @param {string} room - The room name
     * @param {string} messageType - Type of system message
     */
    async saveSystemMessage(message, room = 'general', messageType = 'system') {
        return this.saveMessage({
            username: 'System',
            message,
            room,
            messageType
        });
    }

    /**
     * Clear all messages from a room (admin function)
     * @param {string} room - The room name
     */
    async clearRoom(room = 'general') {
        try {
            const result = await Message.deleteMany({ room });
            console.log(`🗑️ Cleared ${result.deletedCount} messages from ${room}`);
            return result.deletedCount;
        } catch (error) {
            console.error('❌ Error clearing room:', error.message);
            throw error;
        }
    }
}

// Create a singleton instance
const chatService = new ChatService();

module.exports = chatService;