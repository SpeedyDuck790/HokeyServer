const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    room: {
        type: String,
        default: 'general',
        trim: true
    },
    messageType: {
        type: String,
        enum: ['message', 'system', 'join', 'leave'],
        default: 'message'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
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
messageSchema.statics.getRecentMessages = function(room = 'general', limit = 50) {
    return this.find({ room })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
};

// Static method to get message count for a room
messageSchema.statics.getMessageCount = function(room = 'general') {
    return this.countDocuments({ room });
};

// Instance method to mark message as edited
messageSchema.methods.markAsEdited = function() {
    this.isEdited = true;
    this.editedAt = new Date();
    return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;