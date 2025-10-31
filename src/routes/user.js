const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

/**
 * User Routes
 * Base path: /api/users
 * All routes require authentication
 */

// Profile routes
router.get('/profile', requireAuth, userController.getProfile);
router.get('/profile/:username', requireAuth, userController.getUserByUsername);
router.patch('/profile', requireAuth, userController.updateProfile);
router.patch('/status', requireAuth, userController.updateStatus);
router.patch('/settings', requireAuth, userController.updateSettings);

// Avatar routes
router.post('/gravatar', requireAuth, userController.setGravatar);

// Friend routes
router.get('/friends', requireAuth, userController.getFriends);
router.get('/friends/online', requireAuth, userController.getOnlineFriends);
router.post('/friends/request', requireAuth, userController.sendFriendRequest);
router.post('/friends/accept', requireAuth, userController.acceptFriendRequest);
router.post('/friends/reject', requireAuth, userController.rejectFriendRequest);
router.delete('/friends/:friendId', requireAuth, userController.removeFriend);

// Block routes
router.get('/blocked', requireAuth, userController.getBlockedUsers);
router.post('/block', requireAuth, userController.blockUser);
router.delete('/block/:unblockUserId', requireAuth, userController.unblockUser);

// Search route
router.get('/search', requireAuth, userController.searchUsers);

module.exports = router;
