import express from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { upload } from '../middlewares/multer.middleware';
import {
  getConversationsController,
  createConversationController,
  getMessagesController,
  sendMessageController,
  markMessagesReadController,
  archiveConversationController,
  deleteMessageController,
  getConversationController,
  addReactionController,
  removeReactionController,
  getReactionsController,
  uploadMessageFileController
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
router.put('/read', markMessagesReadController);
router.delete('/:messageId', deleteMessageController);

// File Upload Route
router.post('/upload', upload.single('file'), uploadMessageFileController);

// Reaction Routes
router.post('/:messageId/reactions', addReactionController);
router.delete('/:messageId/reactions', removeReactionController);
router.get('/:messageId/reactions', getReactionsController);

export default router;