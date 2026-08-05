// src/lib/message/message.api.ts
import axios from 'axios';
import { API_V1_BASE } from '@/src/lib/config/api';

// Reuse the same pattern as auth.api.ts
const api = axios.create({
  baseURL: API_V1_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Auto token injection (same pattern as existing APIs)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken'); // Use same key as existing APIs
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("📤 Message API request with token");
  } else {
    console.log("📤 Message API request without token");
  }
  return config;
});

// Response interface following existing pattern
export interface MessageAPIResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// ==================== MESSAGE API CALLS ====================

export const getConversations = async (archived = false): Promise<MessageAPIResponse> => {
  try {
    const response = await api.get(`/messages/conversations?archived=${archived}`);
    console.log("📥 Get conversations response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Get conversations error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to get conversations');
  }
};

export const createConversation = async (data: {
  participant_id: string;
  initial_message?: string;
}): Promise<MessageAPIResponse> => {
  try {
    console.log("🔐 Creating conversation for:", data.participant_id);
    const response = await api.post('/messages/conversations', data);
    console.log("📥 Create conversation response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Create conversation error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to create conversation');
  }
};

export const getMessages = async (
  conversationId: string, 
  page = 1, 
  limit = 20
): Promise<MessageAPIResponse> => {
  try {
    const response = await api.get(
      `/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Get messages error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to get messages');
  }
};

export const sendMessage = async (
  conversationId: string,
  data: {
    content?: string;
    message_type?: string;
    reply_to_id?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
  }
): Promise<MessageAPIResponse> => {
  try {
    const response = await api.post(`/messages/conversations/${conversationId}/messages`, data);
    return response.data;
  } catch (error: any) {
    console.error('Send message error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to send message');
  }
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<MessageAPIResponse> => {
  try {
    const response = await api.put('/messages/read', {
      message_ids: messageIds
    });
    return response.data;
  } catch (error: any) {
    console.error('Mark as read error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to mark messages as read');
  }
};

export const archiveConversation = async (
  conversationId: string, 
  isArchived: boolean
): Promise<MessageAPIResponse> => {
  try {
    const response = await api.put(`/messages/conversations/${conversationId}/archive`, {
      is_archived: isArchived
    });
    return response.data;
  } catch (error: any) {
    console.error('Archive conversation error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to archive conversation');
  }
};

export const deleteMessage = async (messageId: string): Promise<MessageAPIResponse> => {
  try {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete message error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to delete message');
  }
};

export const getConversationById = async (conversationId: string): Promise<MessageAPIResponse> => {
  try {
    const response = await api.get(`/messages/conversations/${conversationId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get conversation error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to get conversation');
  }
};

export const addReaction = async (messageId: string, emoji: string): Promise<MessageAPIResponse> => {
  try {
    console.log("➕ Adding reaction to message:", messageId, emoji);
    const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
    console.log("📥 Add reaction response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Add reaction error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to add reaction');
  }
};

export const removeReaction = async (messageId: string): Promise<MessageAPIResponse> => {
  try {
    console.log("➖ Removing reaction from message:", messageId);
    const response = await api.delete(`/messages/${messageId}/reactions`);
    console.log("📥 Remove reaction response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Remove reaction error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to remove reaction');
  }
};

export const getReactions = async (messageId: string): Promise<MessageAPIResponse> => {
  try {
    const response = await api.get(`/messages/${messageId}/reactions`);
    console.log("📥 Get reactions response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Get reactions error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to get reactions');
  }
};

export const uploadMessageFile = async (file: File): Promise<MessageAPIResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log("📤 Uploading file:", file.name, file.type, file.size);

    const response = await api.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log("📥 Upload response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Upload file error:', error);
    throw new Error(error?.response?.data?.message || 'Failed to upload file');
  }
};
