import { Router } from 'express';
import { ChatController } from '../controllers/chatController';

const router = Router();

// POST /api/chat/analyze - Analyze user message with AI
router.post('/analyze', ChatController.analyzeMessage);

// GET /api/chat/conversations - Get chat conversations
router.get('/conversations', ChatController.getConversations);

// POST /api/chat/log - Log conversation
router.post('/log', ChatController.logConversation);

export default router; 