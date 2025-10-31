const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Supports both registered users and guests
 * Hybrid system: users can browse as guest or create full account
 */
const userSchema = new mongoose.Schema({
  // Authentication fields
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows null for guests
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  
  // User identification
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Account type
  isGuest: {
    type: Boolean,
    default: true
  },
  guestSocketId: {
    type: String, // Temporary socket ID for guests
    sparse: true
  },
  
  // Profile information
  profile: {
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    avatar: {
      type: String,
      default: null // URL to avatar image or Gravatar
    },
    status: {
      type: String,
      enum: ['online', 'away', 'dnd', 'invisible', 'offline'],
      default: 'online'
    },
    customStatus: {
      type: String,
      maxlength: 100,
      default: ''
    },
    badges: [{
      type: String,
      enum: ['founder', 'moderator', 'vip', 'contributor', 'verified', 'premium']
    }]
  },
  
  // Social features
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // User settings
  settings: {
    notifications: {
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      allowFriendRequests: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      default: 'dark'
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    }
  },
  
  // Roles and permissions
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  
  // Activity tracking
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Account metadata
  upgradedAt: Date, // When guest upgraded to full account
  verifiedEmail: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.guestSocketId;
      return ret;
    }
  }
});

// Indexes for faster queries (email and username already indexed via unique: true)
userSchema.index({ isGuest: 1 });
userSchema.index({ 'profile.status': 1 });
userSchema.index({ lastSeen: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  // Don't hash if no password (guest users)
  if (!this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to upgrade guest to full account
userSchema.methods.upgradeToFullAccount = async function(email, password, username) {
  // Check if username is provided and different from current
  if (username && username !== this.username) {
    // Check if new username is already taken
    const existingUser = await this.constructor.findOne({ username: username.toLowerCase() });
    if (existingUser && !existingUser._id.equals(this._id)) {
      throw new Error('Username already taken');
    }
    this.username = username;
  }
  
  this.email = email;
  this.password = password;
  this.isGuest = false;
  this.upgradedAt = new Date();
  this.guestSocketId = null;
  return await this.save();
};

// Instance method to update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to add friend
userSchema.methods.addFriend = async function(friendId) {
  if (!this.friends.includes(friendId)) {
    this.friends.push(friendId);
    await this.save();
  }
};

// Instance method to remove friend
userSchema.methods.removeFriend = async function(friendId) {
  this.friends = this.friends.filter(id => !id.equals(friendId));
  await this.save();
};

// Instance method to block user
userSchema.methods.blockUser = async function(userId) {
  if (!this.blockedUsers.includes(userId)) {
    this.blockedUsers.push(userId);
    // Also remove from friends if they were friends
    await this.removeFriend(userId);
    await this.save();
  }
};

// Instance method to unblock user
userSchema.methods.unblockUser = async function(userId) {
  this.blockedUsers = this.blockedUsers.filter(id => !id.equals(userId));
  await this.save();
};

// Static method to find online users
userSchema.statics.findOnlineUsers = function() {
  return this.find({
    'profile.status': { $in: ['online', 'away', 'dnd'] },
    lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Active in last 5 minutes
  }).select('username displayName profile.status profile.avatar');
};

// Static method to find user by email or username
userSchema.statics.findByCredentials = async function(identifier, password) {
  const user = await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ],
    isGuest: false
  }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }
  
  return user;
};

// Static method to create guest user
userSchema.statics.createGuest = async function(username, socketId) {
  // Generate unique username if needed
  let guestUsername = username || `Guest${Math.floor(Math.random() * 10000)}`;
  
  // Check if username exists
  let exists = await this.findOne({ username: guestUsername });
  let counter = 1;
  while (exists) {
    guestUsername = `${username || 'Guest'}${Math.floor(Math.random() * 10000)}`;
    exists = await this.findOne({ username: guestUsername });
    counter++;
    if (counter > 10) break; // Prevent infinite loop
  }
  
  const guestUser = new this({
    username: guestUsername,
    displayName: guestUsername,
    isGuest: true,
    guestSocketId: socketId
  });
  
  return await guestUser.save();
};

const User = mongoose.model('User', userSchema);
module.exports = User;
