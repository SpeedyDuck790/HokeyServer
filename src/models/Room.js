const mongoose = require('mongoose');

// The Room schema defines the structure of chat rooms in the database
// It includes fields for room name, current users list, message count reference, and creation date
const roomSchema = new mongoose.Schema({
    // Name of the room
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 1,
        maxLength: 50
    },
    // Description of the room
    description: {
        type: String,
        trim: true,
        maxLength: 200,
        default: ''
    },
    // List of currently connected users in the room (socket IDs)
    activeUsers: [{
        socketId: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Count of total messages in this room (for quick reference)
    messageCount: {
        type: Number,
        default: 0
    },
    // Creator of the room
    createdBy: {
        type: String,
        default: 'System'
    },
    // Whether the room is public or private
    isPublic: {
        type: Boolean,
        default: true
    },
    // Maximum number of users allowed in the room
    maxUsers: {
        type: Number,
        default: 100
    },
    // Password for private rooms (hashed)
    password: {
        type: String,
        default: null
    },
    // Whether messages should be persisted to database
    persistMessages: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
        transform: function(doc, ret) {
            // Format timestamps for the frontend (with null checks)
            if (ret.createdAt) {
                ret.createdAt = ret.createdAt.toISOString();
            }
            if (ret.updatedAt) {
                ret.updatedAt = ret.updatedAt.toISOString();
            }
            // Don't send password hash to frontend, just indicate if it exists
            ret.hasPassword = !!ret.password;
            delete ret.password;
            return ret;
        }
    }
});

// Index for faster queries (name already indexed via unique: true)
roomSchema.index({ isPublic: 1, createdAt: -1 });

// Static method to get all public rooms
roomSchema.statics.getPublicRooms = function() {
    return this.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .select('name description activeUsers messageCount createdAt createdBy password persistMessages')
        .exec();
};

// Static method to get room by name
roomSchema.statics.getRoomByName = function(name) {
    return this.findOne({ name: name.trim() }).exec();
};

// Instance method to add user to room
roomSchema.methods.addUser = function(socketId, username) {
    // Check if room is full
    if (this.activeUsers.length >= this.maxUsers) {
        throw new Error('Room is full');
    }
    
    // Check if user already in room
    const userExists = this.activeUsers.some(u => u.socketId === socketId);
    if (!userExists) {
        this.activeUsers.push({
            socketId,
            username,
            joinedAt: new Date()
        });
    }
    return this.save();
};

// Instance method to remove user from room
roomSchema.methods.removeUser = function(socketId) {
    this.activeUsers = this.activeUsers.filter(u => u.socketId !== socketId);
    return this.save();
};

// Instance method to get active usernames
roomSchema.methods.getActiveUsernames = function() {
    return this.activeUsers.map(u => u.username);
};

// Instance method to increment message count
roomSchema.methods.incrementMessageCount = function() {
    this.messageCount += 1;
    return this.save();
};

// Create and export the Room model
const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
