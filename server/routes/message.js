import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { sendMessage, getInbox, getSent, getConversation, markConversationRead } from '../controllers/message.js';

const router = express.Router();

// Send a message
router.post('/', authenticateToken, sendMessage);

// Get inbox (received messages)
router.get('/inbox', authenticateToken, getInbox);

// Get sent messages
router.get('/sent', authenticateToken, getSent);

// Get conversation with a specific user
router.get('/conversation/:userId', authenticateToken, getConversation);
// Mark conversation as read
router.post('/read/:userId', authenticateToken, markConversationRead);

export default router;