import { Request, Response } from "express";
import {
  createChatConversation,
  listChatConversations,
  listConversationMessages,
  renameConversation,
  generateChatResponse,
  getCandidateContext,
  getSuggestedQuestions,
  getChatHistory,
  clearChatHistory,
} from "../../services/candidate/ai-chatbot.service";
import { APIResponse } from "../../types/candidate.types";

/* ==================== CREATE CONVERSATION ==================== */
export const createConversationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const convo = await createChatConversation(req.user.user_id);

    res.status(201).json({
      success: true,
      data: convo,
      message: "Conversation created",
    } as APIResponse);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== LIST CONVERSATIONS ==================== */
export const listConversationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "30"), 10) || 30, 1), 50);
    const convos = await listChatConversations(req.user.user_id, limit);

    res.status(200).json({
      success: true,
      data: { conversations: convos, count: convos.length },
      message: "Conversations retrieved",
    } as APIResponse);
  } catch (error) {
    console.error("Error listing conversations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list conversations",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== LIST MESSAGES FOR ONE CONVERSATION ==================== */
export const listConversationMessagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const conversationId = String(req.params.conversationId || "").trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 200);

    if (!conversationId) {
      res.status(400).json({ success: false, message: "conversationId is required" } as APIResponse);
      return;
    }

    const msgs = await listConversationMessages(req.user.user_id, conversationId, limit);

    res.status(200).json({
      success: true,
      data: { messages: msgs, count: msgs.length },
      message: "Messages retrieved",
    } as APIResponse);
  } catch (error) {
    console.error("Error listing messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list messages",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== RENAME CONVERSATION ==================== */
export const renameConversationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const conversationId = String(req.params.conversationId || "").trim();
    const title = String(req.body?.title || "").trim();

    if (!conversationId) {
      res.status(400).json({ success: false, message: "conversationId is required" } as APIResponse);
      return;
    }
    if (!title) {
      res.status(400).json({ success: false, message: "title is required" } as APIResponse);
      return;
    }

    await renameConversation(req.user.user_id, conversationId, title);

    res.status(200).json({
      success: true,
      message: "Conversation renamed",
    } as APIResponse);
  } catch (error) {
    console.error("Error renaming conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rename conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== SEND MESSAGE ==================== */
/**
 * IMPORTANT: generateChatResponse expects:
 * (candidateId, conversationId, userMessage)
 */
export const sendChatMessageController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const message = String(req.body?.message || "");
    const conversationId = String(req.body?.conversationId || req.body?.conversation_id || "").trim();

    if (!conversationId) {
      res.status(400).json({ success: false, message: "conversationId is required" } as APIResponse);
      return;
    }
    if (!message || message.trim().length === 0) {
      res.status(400).json({ success: false, message: "Message cannot be empty" } as APIResponse);
      return;
    }
    if (message.length > 1000) {
      res.status(400).json({ success: false, message: "Message is too long (max 1000 characters)" } as APIResponse);
      return;
    }

    const result = await generateChatResponse(req.user.user_id, conversationId, message);

    res.status(200).json({
      success: true,
      data: {
        response: result.response,
        context_used: result.context_used,
        timestamp: new Date(),
      },
      message: "Response generated successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error sending chat message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate response",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== SUGGESTIONS ==================== */
export const getSuggestedQuestionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const context = await getCandidateContext(req.user.user_id);
    const suggestions = getSuggestedQuestions(context);

    res.status(200).json({
      success: true,
      data: { questions: suggestions, count: suggestions.length },
      message: "Suggested questions retrieved successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error getting suggested questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get suggested questions",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

/* ==================== LEGACY HISTORY ENDPOINTS ==================== */
export const getChatHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const limit = parseInt(String(req.query.limit || "50"), 10) || 50;
    const history = await getChatHistory(req.user.user_id, limit);

    res.status(200).json({
      success: true,
      data: { messages: history, count: history.length },
      message: "Chat history retrieved successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error getting chat history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat history",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};

export const clearChatHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    await clearChatHistory(req.user.user_id);

    res.status(200).json({
      success: true,
      message: "Chat history cleared successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear chat history",
      error: error instanceof Error ? error.message : "Unknown error",
    } as APIResponse);
  }
};
