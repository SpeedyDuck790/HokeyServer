const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret - should be in .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Middleware to authenticate JWT token
 * Supports both registered users and guests
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - allow as guest
      req.user = null;
      req.isGuest = true;
      return next();
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Update last activity
    user.lastActivity = new Date();
    await user.save();
    
    // Attach user to request
    req.user = user;
    req.isGuest = user.isGuest;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require authentication (no guests allowed)
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.isGuest) {
      return res.status(403).json({ error: 'Full account required for this action' });
    }
    
    // Update last activity
    user.lastActivity = new Date();
    await user.save();
    
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

/**
 * Middleware to require moderator or admin role
 */
const requireModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'moderator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Moderator access required' });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

/**
 * Socket.io authentication middleware
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // No token - allow as guest
      socket.user = null;
      socket.isGuest = true;
      return next();
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      // Invalid token - allow as guest
      socket.user = null;
      socket.isGuest = true;
      return next();
    }
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      // User not found - allow as guest
      socket.user = null;
      socket.isGuest = true;
      return next();
    }
    
    // Update last activity
    user.lastActivity = new Date();
    user.lastSeen = new Date();
    await user.save();
    
    // Attach user to socket
    socket.user = user;
    socket.userId = user._id;
    socket.isGuest = user.isGuest;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    // Allow connection as guest on error
    socket.user = null;
    socket.isGuest = true;
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  requireAuth,
  requireAdmin,
  requireModerator,
  authenticateSocket
};
