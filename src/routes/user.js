const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAuth } = require('../middleware/auth');

/**
 * User Routes
 * Base path: /api/users
 * All routes require authentication (some allow guests, others require full accounts)
 */

// Profile routes (guests allowed to view/update their own profile and status)
router.get('/profile', authenticate, userController.getProfile);
router.get('/profile/:username', authenticate, userController.getUserByUsername);
router.patch('/profile', authenticate, userController.updateProfile);
router.patch('/status', authenticate, userController.updateStatus);
router.patch('/settings', authenticate, userController.updateSettings);

// Avatar routes (guests can set avatar)
router.post('/gravatar', authenticate, userController.setGravatar);

// Friend routes (require full account)
router.get('/friends', requireAuth, userController.getFriends);
router.get('/friends/online', requireAuth, userController.getOnlineFriends);
router.get('/friends/requests', requireAuth, userController.getFriendRequests);
router.post('/friends/request', requireAuth, userController.sendFriendRequest);
router.post('/friends/accept', requireAuth, userController.acceptFriendRequest);
router.post('/friends/reject', requireAuth, userController.rejectFriendRequest);
router.delete('/friends/:friendId', requireAuth, userController.removeFriend);

// Block routes (require full account)
router.get('/blocked', requireAuth, userController.getBlockedUsers);
router.post('/block', requireAuth, userController.blockUser);
router.delete('/block/:unblockUserId', requireAuth, userController.unblockUser);

// Search route (guests allowed)
router.get('/search', authenticate, userController.searchUsers);

module.exports = router;
