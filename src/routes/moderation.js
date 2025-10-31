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
router.delete('/delete-message/:messageId', requireAuth, moderationController.deleteMessage);

// User moderation
router.post('/ban-user', requireAuth, moderationController.banUser);
router.post('/unban-user', requireAuth, moderationController.unbanUser);
router.post('/kick-user', requireAuth, moderationController.kickUser);

module.exports = router;
