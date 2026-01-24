import { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import { 
  CreateConversationSchema, 
  SendMessageSchema, 
  GetMessagesSchema, 
  MarkReadSchema,
  ArchiveConversationSchema,
  ConversationParamsSchema,
  MessageParamsSchema
} from '../validation/message.schema';

interface APIResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * GET /api/conversations
 * Get all conversations for authenticated user
 */
export const getConversationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const archived = req.query.archived === 'true';
    const conversations = await messageService.getConversations(req.user.user_id, archived);

    res.status(200).json({
      success: true,
      data: conversations,
      message: 'Conversations retrieved successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * POST /api/conversations
 * Create new conversation
 */
export const createConversationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const validatedData = CreateConversationSchema.parse(req.body);
    const result = await messageService.createConversation(req.user.user_id, validatedData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Conversation created successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages from a conversation with pagination
 */
export const getMessagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { conversationId } = ConversationParamsSchema.parse(req.params);
    const queryParams = GetMessagesSchema.parse(req.query);
    
    const messages = await messageService.getMessages(req.user.user_id, conversationId, queryParams);

    res.status(200).json({
      success: true,
      data: messages,
      message: 'Messages retrieved successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to get messages',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * POST /api/conversations/:conversationId/messages
 * Send a message
 */
export const sendMessageController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { conversationId } = ConversationParamsSchema.parse(req.params);
    const validatedData = SendMessageSchema.parse(req.body);
    
    const message = await messageService.sendMessage(req.user.user_id, conversationId, validatedData);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * PUT /api/messages/read
 * Mark messages as read
 */
export const markMessagesReadController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const validatedData = MarkReadSchema.parse(req.body);
    const result = await messageService.markMessagesAsRead(req.user.user_id, validatedData);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Messages marked as read'
    } as APIResponse);

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * PUT /api/conversations/:conversationId/archive
 * Archive/unarchive a conversation
 */
export const archiveConversationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { conversationId } = ConversationParamsSchema.parse(req.params);
    const validatedData = ArchiveConversationSchema.parse(req.body);
    
    const result = await messageService.archiveConversation(req.user.user_id, conversationId, validatedData);

    res.status(200).json({
      success: true,
      data: result,
      message: validatedData.is_archived ? 'Conversation archived' : 'Conversation unarchived'
    } as APIResponse);

  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to archive conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * DELETE /api/messages/:messageId
 * Delete a message (soft delete)
 */
export const deleteMessageController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { messageId } = MessageParamsSchema.parse(req.params);
    const result = await messageService.deleteMessage(req.user.user_id, messageId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Message deleted successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete message',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * GET /api/conversations/:conversationId
 * Get conversation details
 */
export const getConversationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { conversationId } = ConversationParamsSchema.parse(req.params);
    const conversation = await messageService.getConversationById(req.user.user_id, conversationId);

    res.status(200).json({
      success: true,
      data: conversation,
      message: 'Conversation retrieved successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to get conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * POST /api/messages/:messageId/reactions
 * Add or update reaction to a message
 */
export const addReactionController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Emoji is required',
        error: 'VALIDATION_ERROR'
      } as APIResponse);
      return;
    }

    const reaction = await messageService.addReaction(
      messageId,
      req.user.user_id,
      emoji
    );

    res.status(200).json({
      success: true,
      data: reaction,
      message: 'Reaction added successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * DELETE /api/messages/:messageId/reactions
 * Remove reaction from a message
 */
export const removeReactionController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { messageId } = req.params;

    await messageService.removeReaction(messageId, req.user.user_id);

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * GET /api/messages/:messageId/reactions
 * Get all reactions for a message
 */
export const getReactionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    const { messageId } = req.params;

    const reactions = await messageService.getReactions(messageId);

    res.status(200).json({
      success: true,
      data: reactions,
      message: 'Reactions retrieved successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

/**
 * POST /api/messages/upload
 * Upload file for message (image, video, voice, file)
 */
export const uploadMessageFileController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file provided',
        error: 'NO_FILE'
      } as APIResponse);
      return;
    }

    const userId = req.user.user_id;
    const file = req.file;

    // Import handleUpload dynamically
    const { handleUpload } = await import('../services/upload/upload.service');
    const { signedUrl } = await import('../services/upload/storage.service');

    // Upload to MinIO/S3
    const { documentId } = await handleUpload({
      buffer: file.buffer,
      originalName: file.originalname,
      uploadedBy: userId,
      subjectType: 'MESSAGE',
      subjectId: userId, // Use userId as subject for messages
      documentType: 'message_attachment',
    });

    // Get uploaded document
    const prisma = (await import('../lib/prisma')).default;
    const document = await prisma.uploadedDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) {
      res.status(500).json({
        success: false,
        message: 'File uploaded but not found in database',
        error: 'UPLOAD_ERROR'
      } as APIResponse);
      return;
    }

    // Generate signed URL for access
    const fileUrl = await signedUrl(document.storage_key);

    res.status(200).json({
      success: true,
      data: {
        file_url: fileUrl,
        file_name: document.file_name,
        file_size: document.file_size,
        mime_type: document.mime_type,
        document_id: documentId
      },
      message: 'File uploaded successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};
