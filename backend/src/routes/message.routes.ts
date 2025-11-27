import express from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { 
  getConversationsController,
  createConversationController, 
  getMessagesController,
  sendMessageController,
  markMessagesReadController,
  archiveConversationController,
  deleteMessageController,
  getConversationController
} from '../controller/message.controller';

const router = express.Router();

// All message routes require authentication
router.use(checkAuth);

// Conversation Routes
router.get('/conversations', getConversationsController);
router.post('/conversations', createConversationController);
router.get('/conversations/:conversationId', getConversationController);
router.put('/conversations/:conversationId/archive', archiveConversationController);

// Message Routes
router.get('/conversations/:conversationId/messages', getMessagesController);
router.post('/conversations/:conversationId/messages', sendMessageController);
router.put('/messages/read', markMessagesReadController);
router.delete('/messages/:messageId', deleteMessageController);

export default router;