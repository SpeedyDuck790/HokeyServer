const Message = require('../models/Message');

class ChatService {
    constructor() {
        this.maxMessagesPerRoom = 1000; // messages Limit per room
    }

    /**
     * Save a new message to the database
     * @param {Object} messageData - The message data
     * @param {string} messageData.username - The username
     * @param {string} messageData.message - The message content
     * @param {string} messageData.room - The room name (default: 'global')
     * @param {string} messageData.messageType - Type of message (default: 'message')
     * @returns {Promise<Object>} The saved message
     */
    async saveMessage(messageData) {
        try {
            // Destructure messageData as well as set defaults
            const { username, message, room = 'global', messageType = 'message' } = messageData;

            //----------------------------------------------------------------------
            // there will be a way of setting "message type" and "room" later here |
            // ---------------------------------------------------------------------

            // Validate for no null/undefined values
            if (!username || !message) {
                throw new Error('Username and message are required');
            }

            // Validate username length
            if (username.length > 50) {
                throw new Error('Username too long (max 50 characters)');
            }

            // Validate message length
            if (message.length > 500) {
                throw new Error('Message too long (max 500 characters)');
            }

            // Create and save the message using the message model 
            const newMessage = new Message({
                username: username.trim(),
                message: message.trim(),
                room: room.trim(),
                messageType,
                timestamp: new Date()
            });

            // Save the message to the database
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
     * @param {string} room - The room name (default: 'global')
     * @param {number} limit - Number of messages to retrieve (default: 50)
     * @returns {Promise<Array>} Array of messages
     */
    async getLimitedMessages(room = 'global', limit = 50) {
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
    async getAllMessages(room = 'global') {
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
     * Delete old messages if room exceeds the limit
     * @param {string} room - The room name
     */
    async cleanupOldMessages(room = 'global') {
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
     * Clear all messages from a room (admin function)
     * @param {string} room - The room name
     */
    async clearRoom(room = 'global') {
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

// singleton instance
const chatService = new ChatService();
//export the singleton instance
module.exports = chatService;