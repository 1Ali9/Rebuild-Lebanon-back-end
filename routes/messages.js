const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');

router.get('/conversations', authMiddleware, messagesController.getConversations);
router.post('/conversations', authMiddleware, messagesController.createConversation);
router.get('/conversation/:conversationId', authMiddleware, messagesController.getMessages);
router.post('/', authMiddleware, messagesController.sendMessage);
router.patch('/:id/read', authMiddleware, messagesController.markAsRead);

module.exports = router;
