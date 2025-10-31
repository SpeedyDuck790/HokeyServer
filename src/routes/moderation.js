const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { requireAuth } = require('../middleware/auth');

/**
 * Moderation Routes
 * Base path: /api/moderation
 * All routes require authentication and appropriate moderator/admin privileges
 */

// Message moderation
router.delete('/delete-message/:messageId', requireAuth, (req, res) => moderationController.deleteMessage(req, res));

// User moderation
router.post('/ban-user', requireAuth, (req, res) => moderationController.banUser(req, res));
router.post('/unban-user', requireAuth, (req, res) => moderationController.unbanUser(req, res));
router.post('/kick-user', requireAuth, (req, res) => moderationController.kickUser(req, res));

// Role assignment (Chat Admin only)
router.post('/assign-moderator', requireAuth, (req, res) => moderationController.assignModerator(req, res));
router.post('/remove-moderator', requireAuth, (req, res) => moderationController.removeModerator(req, res));

module.exports = router;
