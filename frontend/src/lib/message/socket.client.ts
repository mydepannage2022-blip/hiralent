// src/lib/message/socket.client.ts
// Socket.io v4+ import syntax
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/src/lib/config/api';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  // Disconnect existing socket
  if (socket) {
    socket.disconnect();
  }

  console.log("🔌 Initializing Socket.io connection to:", SOCKET_URL);
  
  socket = io(SOCKET_URL, {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: parseInt(process.env.NEXT_PUBLIC_SOCKET_RECONNECT_ATTEMPTS || '5'),
    reconnectionDelay: 1000,
    timeout: 20000
  });

  // Connection events with proper typing
  socket.on('connect', () => {
    console.log("✅ Socket connected:", socket?.id);
    if (process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
      console.log("🔧 Socket debug info:", {
        id: socket?.id,
        connected: socket?.connected,
        transport: socket?.io.engine.transport.name
      });
    }
  });

  socket.on('disconnect', (reason: string) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on('connect_error', (error: Error) => {
    console.error("🔥 Socket connection error:", error.message);
  });

  socket.on('reconnect', (attemptNumber: number) => {
    console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
  });

  socket.on('reconnect_error', (error: Error) => {
    console.error("🔥 Socket reconnection error:", error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    console.log("🔌 Disconnecting socket");
    socket.disconnect();
    socket = null;
  }
};

// ==================== SOCKET EVENT EMITTERS ====================

export const joinConversation = (conversationId: string): void => {
  if (socket && socket.connected) {
    socket.emit('join_conversation', conversationId);
    console.log("🚪 Joined conversation:", conversationId);
  } else {
    console.warn("⚠️ Cannot join conversation: Socket not connected");
  }
};

export const leaveConversation = (conversationId: string): void => {
  if (socket && socket.connected) {
    socket.emit('leave_conversation', conversationId);
    console.log("🚪 Left conversation:", conversationId);
  }
};

export const sendSocketMessage = (data: {
  conversation_id: string;
  content?: string;
  message_type?: string;
  reply_to_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}): void => {
  if (socket && socket.connected) {
    socket.emit('send_message', data);
    console.log("📤 Sent message via socket");
    
    if (process.env.NEXT_PUBLIC_DEBUG_MESSAGES === 'true') {
      console.log("📤 Message debug:", data);
    }
  } else {
    console.warn("⚠️ Cannot send message: Socket not connected");
  }
};

export const startTyping = (conversationId: string): void => {
  if (socket && socket.connected) {
    socket.emit('typing_start', { conversation_id: conversationId });
  }
};

export const stopTyping = (conversationId: string): void => {
  if (socket && socket.connected) {
    socket.emit('typing_stop', { conversation_id: conversationId });
  }
};

export const markSocketRead = (messageIds: string[], conversationId?: string): void => {
  if (socket && socket.connected) {
    // conversation_id lets the server scope the read-receipt to the conversation
    // room instead of broadcasting it to every connected client.
    socket.emit('mark_messages_read', { message_ids: messageIds, conversation_id: conversationId });
  }
};

// ==================== SOCKET EVENT LISTENERS ====================

export const onNewMessage = (callback: (message: any) => void): void => {
  if (socket) {
    socket.on('new_message', callback);
  }
};

export const onMessageSent = (callback: (message: any) => void): void => {
  if (socket) {
    socket.on('message_sent', callback);
  }
};

export const onUserTyping = (callback: (data: {
  user_id: string;
  full_name: string;
  conversation_id: string;
  typing: boolean;
}) => void): void => {
  if (socket) {
    socket.on('user_typing', callback);
  }
};

export const onMessageRead = (callback: (data: {
  message_id: string;
  read_by: string;
  read_at: string;
}) => void): void => {
  if (socket) {
    socket.on('message_read', callback);
  }
};

export const onUserJoined = (callback: (data: {
  user_id: string;
  full_name: string;
  timestamp: string;
}) => void): void => {
  if (socket) {
    socket.on('user_joined', callback);
  }
};

export const onUserLeft = (callback: (data: {
  user_id: string;
  timestamp: string;
}) => void): void => {
  if (socket) {
    socket.on('user_left', callback);
  }
};

export const onUserOffline = (callback: (data: {
  user_id: string;
  timestamp: string;
}) => void): void => {
  if (socket) {
    socket.on('user_offline', callback);
  }
};

export const onSocketError = (callback: (error: {
  message: string;
  error?: string;
}) => void): void => {
  if (socket) {
    socket.on('error', callback);
  }
};

// ==================== CLEANUP FUNCTIONS ====================

export const offAllListeners = (): void => {
  if (socket) {
    socket.off('new_message');
    socket.off('message_sent');
    socket.off('user_typing');
    socket.off('message_read');
    socket.off('reaction_added');
    socket.off('reaction_removed');
    socket.off('message_deleted');
    socket.off('user_joined');
    socket.off('user_left');
    socket.off('user_offline');
    socket.off('error');
  }
};

export const offSpecificListener = (event: string): void => {
  if (socket) {
    socket.off(event);
  }
};

// ==================== HELPER FUNCTIONS ====================

export const isSocketConnected = (): boolean => {
  return socket ? socket.connected : false;
};

export const getSocketId = (): string | null => {
  return socket ? (socket.id || null) : null;
};

export const reconnectSocket = (): void => {
  if (socket) {
    socket.connect();
  }
};

export const getSocketStatus = () => {
  if (!socket) return 'not_initialized';
  if (socket.connected) return 'connected';
  if (socket.disconnected) return 'disconnected';
  return 'connecting';
};