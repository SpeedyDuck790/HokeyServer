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
router.post('/assign-badge', requireAuth, (req, res) => adminController.assignBadge(req, res));
router.post('/remove-badge', requireAuth, (req, res) => adminController.removeBadge(req, res));

// User management
router.delete('/delete-user/:userId', requireAuth, (req, res) => adminController.deleteUser(req, res));

// Room management
router.delete('/delete-room/:roomId', requireAuth, (req, res) => adminController.deleteRoom(req, res));
router.post('/assign-room-role', requireAuth, (req, res) => adminController.assignRoomRole(req, res));
router.delete('/remove-room-role', requireAuth, (req, res) => adminController.removeRoomRole(req, res));

module.exports = router;
