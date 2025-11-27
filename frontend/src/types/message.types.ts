// src/lib/message/message.types.ts

// ==================== BACKEND API TYPES ====================

export type MessageType = "text" | "voice" | "image" | "video" | "file" | "location";

export interface MessageSender {
  user_id: string;
  full_name: string;
  profile_picture_url?: string | null;
  role: string;
}

export interface MessageReply {
  message_id: string;
  content: string | null;
  sender_name: string;
  message_type: MessageType;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  is_read: boolean;
  is_deleted: boolean;
  sent_at: string;
  read_at?: string | null;
  reply_to_id?: string | null;
  sender: MessageSender;
  reply_to?: MessageReply | null;
}

export interface ConversationParticipant {
  user_id: string;
  full_name: string;
  profile_picture_url?: string | null;
  role: string;
  is_online?: boolean;
  last_seen?: string | null;
}

export interface LastMessage {
  message_id: string;
  content: string | null;
  message_type: MessageType;
  sender_id: string;
  sent_at: string;
  is_read: boolean;
}

export interface Conversation {
  conversation_id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  last_message_id?: string | null;
  unread_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  other_participant: ConversationParticipant;
  last_message?: LastMessage | null;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface CreateConversationRequest {
  participant_id: string;
  initial_message?: string;
}

export interface CreateConversationResponse {
  conversation_id: string;
}

export interface SendMessageRequest {
  content?: string;
  message_type?: MessageType;
  reply_to_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

export interface GetMessagesQuery {
  page?: number;
  limit?: number;
  before_message_id?: string;
}

export interface MarkReadRequest {
  message_ids: string[];
}

export interface ArchiveConversationRequest {
  is_archived: boolean;
}

export interface MessageAPIResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// ==================== SOCKET EVENT TYPES ====================

export interface SocketMessageData {
  conversation_id: string;
  content?: string;
  message_type?: MessageType;
  reply_to_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

export interface SocketTypingData {
  conversation_id: string;
}

export interface SocketMarkReadData {
  message_ids: string[];
}

export interface SocketEventData {
  new_message: Message;
  message_sent: Message;
  user_typing: {
    user_id: string;
    full_name: string;
    conversation_id: string;
    typing: boolean;
  };
  message_read: {
    message_id: string;
    read_by: string;
    read_at: string;
  };
  user_joined: {
    user_id: string;
    full_name: string;
    timestamp: string;
  };
  user_left: {
    user_id: string;
    timestamp: string;
  };
  user_offline: {
    user_id: string;
    timestamp: string;
  };
  error: {
    message: string;
    error?: string;
  };
}

// ==================== LEGACY COMPONENT TYPES ====================

export interface LegacyMessage {
  id: string | number;
  sender: "me" | "them";
  text: string;
  type: MessageType;
  fileName?: string;
  timestamp: string;
  replyTo?: {
    sender: "me" | "them";
    text: string;
    type: MessageType;
    fileName?: string;
  };
}

export interface LegacyConversation {
  id: string | number;
  name: string;
  avatar: string;
  lastSeen: string;
  unreadCount?: number;
  isActive?: boolean;
  messages: LegacyMessage[];
}

// ==================== CONVERTER FUNCTION TYPES ====================

export type MessageConverter = (message: Message, currentUserId: string) => LegacyMessage;
export type ConversationConverter = (conversation: Conversation, messages: Message[], currentUserId: string) => LegacyConversation;

// ==================== CONVERTER FUNCTIONS ====================

export const convertToLegacyMessage = (
  message: Message, 
  currentUserId: string
): LegacyMessage => ({
  id: message.message_id,
  sender: message.sender_id === currentUserId ? "me" : "them",
  text: message.content || message.file_name || '',
  type: message.message_type,
  fileName: message.file_name || undefined,
  timestamp: new Date(message.sent_at).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  }),
  replyTo: message.reply_to ? {
    sender: message.reply_to.sender_name === "You" ? "me" : "them",
    text: message.reply_to.content || '',
    type: message.reply_to.message_type,
    fileName: undefined
  } : undefined
});

export const convertToLegacyConversation = (
  conversation: Conversation,
  messages: Message[] = [],
  currentUserId: string
): LegacyConversation => ({
  id: conversation.conversation_id,
  name: conversation.other_participant.full_name,
  avatar: conversation.other_participant.profile_picture_url || '/images/default-avatar.png',
  lastSeen: conversation.other_participant.is_online ? "Online" : getLastSeenText(conversation.other_participant.last_seen),
  unreadCount: conversation.unread_count > 0 ? conversation.unread_count : undefined,
  isActive: conversation.other_participant.is_online || false,
  messages: messages.map(msg => convertToLegacyMessage(msg, currentUserId))
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Get human-readable last seen text
 */
export const getLastSeenText = (lastSeen?: string | null): string => {
  if (!lastSeen) return "Offline";
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Last seen yesterday";
  if (diffDays < 7) return `Last seen ${diffDays} days ago`;
  
  return lastSeenDate.toLocaleDateString();
};

/**
 * Get message preview text for conversation list
 */
export const getMessagePreview = (message: Message): string => {
  switch (message.message_type) {
    case 'text':
    case 'location':
      return message.content || '';
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'voice':
      return '🎤 Voice message';
    case 'file':
      return `📎 ${message.file_name || 'File'}`;
    default:
      return 'Message';
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon based on file extension
 */
export const getFileIcon = (fileName?: string): string => {
  if (!fileName) return '📎';
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return '🎥';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return '🎵';
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📽️';
    case 'zip':
    case 'rar':
    case '7z':
      return '🗜️';
    default:
      return '📎';
  }
};

/**
 * Validate message content
 */
export const validateMessage = (message: LegacyMessage): boolean => {
  if (!message.text && !message.fileName) return false;
  if (message.type === 'text' && !message.text.trim()) return false;
  return true;
};

/**
 * Sanitize message content
 */
export const sanitizeMessageContent = (content: string): string => {
  // Basic HTML escaping
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Generate unique message ID
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if message is from current user
 */
export const isMyMessage = (message: Message | LegacyMessage, currentUserId: string): boolean => {
  if ('sender_id' in message) {
    return message.sender_id === currentUserId;
  } else {
    return message.sender === "me";
  }
};

/**
 * Group messages by date
 */
export const groupMessagesByDate = (messages: LegacyMessage[]): { [date: string]: LegacyMessage[] } => {
  return messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as { [date: string]: LegacyMessage[] });
};

/**
 * Filter conversations by search query
 */
export const filterConversations = (
  conversations: LegacyConversation[], 
  searchQuery: string
): LegacyConversation[] => {
  if (!searchQuery.trim()) return conversations;
  
  const query = searchQuery.toLowerCase();
  return conversations.filter(conv => 
    conv.name.toLowerCase().includes(query) ||
    conv.messages.some(msg => 
      msg.text.toLowerCase().includes(query)
    )
  );
};

/**
 * Sort conversations by last message time
 */
export const sortConversationsByTime = (conversations: LegacyConversation[]): LegacyConversation[] => {
  return [...conversations].sort((a, b) => {
    const aLastMessage = a.messages[a.messages.length - 1];
    const bLastMessage = b.messages[b.messages.length - 1];
    
    if (!aLastMessage) return 1;
    if (!bLastMessage) return -1;
    
    const aTime = new Date(aLastMessage.timestamp).getTime();
    const bTime = new Date(bLastMessage.timestamp).getTime();
    
    return bTime - aTime; // Most recent first
  });
};

// ==================== COMPONENT PROP TYPES ====================

export interface ChatShellProps {
  initialConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export interface ChatSidebarProps {
  conversations: LegacyConversation[];
  activeId: string | number | null;
  onSelectChat: (id: string | number) => void;
  isLoading?: boolean;
  showArchived?: boolean;
}

export interface ChatWindowProps {
  conversation: LegacyConversation | null;
  onBack: () => void;
  onSendMessage: (chatId: string | number, message: LegacyMessage) => void;
  typingUsers?: Set<string>;
  isLoading?: boolean;
}

// ==================== HOOK RETURN TYPES ====================

export interface UseConversationsResult {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
}

export interface UseSocketResult {
  isConnected: boolean;
  socketId: string | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: SocketMessageData) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markAsRead: (messageIds: string[]) => void;
}

// ==================== UTILITY TYPES ====================

export interface FileUploadResponse {
  success: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  message?: string;
  error?: string;
}

export interface MessageFormData {
  content: string;
  type: MessageType;
  replyTo?: LegacyMessage;
  file?: File;
}

export interface ConversationFilter {
  archived?: boolean;
  unreadOnly?: boolean;
  search?: string;
}

export interface MessageFilter {
  before?: string;
  after?: string;
  type?: MessageType;
  sender?: string;
}

// ==================== ERROR TYPES ====================

export interface MessageError {
  code: string;
  message: string;
  details?: any;
}

export type MessageErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'FILE_UPLOAD_ERROR'
  | 'SOCKET_ERROR'
  | 'UNKNOWN_ERROR';

// ==================== CONSTANTS ====================

export const MESSAGE_TYPES: Record<string, MessageType> = {
  TEXT: 'text',
  VOICE: 'voice',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  LOCATION: 'location'
} as const;

export const SOCKET_EVENTS = {
  // Emit events
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MARK_READ: 'mark_messages_read',
  
  // Listen events
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  USER_TYPING: 'user_typing',
  MESSAGE_READ: 'message_read',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_OFFLINE: 'user_offline',
  ERROR: 'error'
} as const;

export const API_ENDPOINTS = {
  CONVERSATIONS: '/messages/conversations',
  MESSAGES: (conversationId: string) => `/messages/conversations/${conversationId}/messages`,
  MARK_READ: '/messages/messages/read',
  ARCHIVE: (conversationId: string) => `/messages/conversations/${conversationId}/archive`,
  DELETE: (messageId: string) => `/messages/messages/${messageId}`,
  UPLOAD: '/uploads/message'
} as const;