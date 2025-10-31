const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');

/**
 * Admin Routes
 * Base path: /api/admin
 * All routes require authentication and admin privileges
 */

// Badge management
router.post('/assign-badge', requireAuth, adminController.assignBadge);
router.post('/remove-badge', requireAuth, adminController.removeBadge);

// User management
router.delete('/delete-user/:userId', requireAuth, adminController.deleteUser);

// Room management
router.delete('/delete-room/:roomId', requireAuth, adminController.deleteRoom);
router.post('/assign-room-role', requireAuth, adminController.assignRoomRole);
router.delete('/remove-room-role', requireAuth, adminController.removeRoomRole);

module.exports = router;
