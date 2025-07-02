const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');

router.get('/conversations', authMiddleware, messagesController.getConversations);
router.get('/conversation/:conversationId', authMiddleware, messagesController.getMessages);
router.post('/conversation', authMiddleware, messagesController.createConversation);
router.post('/', authMiddleware, messagesController.sendMessage);

module.exports = router;
