const mongoose = require('mongoose');

// the Message schema defines the structure of chat messages in the database
// It includes fields for username, message content, timestamp, room, message type, and edit status
const messageSchema = new mongoose.Schema({
    // Username of the message sender
    username: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    // Content of the message
    message: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    // Timestamp of when the message was sent
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    // Room the message belongs to
    room: {
        type: String,
        default: 'global',
        trim: true
    },
    // Type of message if i want to expand later
    messageType: {
        type: String,
        enum: ['message'],
        default: 'message'
    },
    // Indicates if the message has been edited
    isEdited: {
        type: Boolean,
        default: false
    },
    // Timestamp of when the message was last edited
    editedAt: {
        type: Date
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
        transform: function(doc, ret) {
            // Format the timestamp for the frontend
            ret.timestamp = ret.timestamp.toISOString();
            return ret;
        }
    }
});

// Index for faster queries
messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ username: 1, timestamp: -1 });

// Static method to get recent messages
// The static method in your model describes what it does: 
// get recent messages (e.g., getRecentMessages).
messageSchema.statics.getRecentMessages = function(room = 'global', limit = 50) {
    return this.find({ room })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
};

// Static method to get message count for a room
messageSchema.statics.getMessageCount = function(room = 'global') {
    return this.countDocuments({ room });
};

// Instance method to mark message as edited
messageSchema.methods.markAsEdited = function() {
    this.isEdited = true;
    this.editedAt = new Date();
    return this.save();
};

// Create and export the Message model
const Message = mongoose.model('Message', messageSchema);
module.exports = Message;