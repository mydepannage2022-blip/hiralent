// src/hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  getSocket, 
  initializeSocket, 
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendSocketMessage,
  startTyping,
  stopTyping,
  markSocketRead,
  isSocketConnected,
  getSocketId,
  offAllListeners
} from '../lib/message/socket.client';
import { useAuth } from '../context/AuthContext';
import type { 
  Message, 
  SocketEventData, 
  SocketMessageData,
  UseSocketResult 
} from '../types/message.types';

export const useSocket = (): UseSocketResult => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (token) {
      console.log("🔌 Initializing socket connection");
      const socket = initializeSocket(token);
      
      // Set up connection event listeners
      const handleConnect = () => {
        setIsConnected(true);
        setSocketId(getSocketId());
        console.log("✅ Socket connected successfully");
        
        // Clear any reconnect timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      const handleDisconnect = (reason: string) => {
        setIsConnected(false);
        setSocketId(null);
        console.log("❌ Socket disconnected:", reason);
        
        // Auto-reconnect on unexpected disconnection
        if (reason === 'io server disconnect') {
          console.log("🔄 Server disconnected, attempting to reconnect...");
          reconnectTimeoutRef.current = setTimeout(() => {
            if (token) {
              initializeSocket(token);
            }
          }, 2000);
        }
      };

      const handleConnectError = (error: Error) => {
        setIsConnected(false);
        setSocketId(null);
        console.error("🔥 Socket connection error:", error.message);
      };

      // Add event listeners
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up socket connection");
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        disconnectSocket();
        setIsConnected(false);
        setSocketId(null);
      };
    }
  }, [token]);

  // Memoized event handlers
  const handleJoinConversation = useCallback((conversationId: string) => {
    if (isConnected) {
      joinConversation(conversationId);
    } else {
      console.warn("⚠️ Cannot join conversation: Socket not connected");
    }
  }, [isConnected]);

  const handleLeaveConversation = useCallback((conversationId: string) => {
    if (isConnected) {
      leaveConversation(conversationId);
    } else {
      console.warn("⚠️ Cannot leave conversation: Socket not connected");
    }
  }, [isConnected]);

  const handleSendMessage = useCallback((data: SocketMessageData) => {
    if (isConnected) {
      sendSocketMessage(data);
    } else {
      console.warn("⚠️ Cannot send message: Socket not connected");
      throw new Error("Socket not connected");
    }
  }, [isConnected]);

  const handleStartTyping = useCallback((conversationId: string) => {
    if (isConnected) {
      startTyping(conversationId);
    }
  }, [isConnected]);

  const handleStopTyping = useCallback((conversationId: string) => {
    if (isConnected) {
      stopTyping(conversationId);
    }
  }, [isConnected]);

  const handleMarkAsRead = useCallback((messageIds: string[]) => {
    if (isConnected) {
      markSocketRead(messageIds);
    } else {
      console.warn("⚠️ Cannot mark as read: Socket not connected");
    }
  }, [isConnected]);

  return {
    isConnected,
    socketId,
    joinConversation: handleJoinConversation,
    leaveConversation: handleLeaveConversation,
    sendMessage: handleSendMessage,
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    markAsRead: handleMarkAsRead
  };
};

// ==================== SPECIALIZED HOOKS ====================

export const useSocketEvents = () => {
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [messageSent, setMessageSent] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      console.log("📨 New message received:", message);
      setNewMessage(message);
    };

    const handleMessageSent = (message: Message) => {
      console.log("✅ Message sent confirmed:", message);
      setMessageSent(message);
    };

    const handleUserTyping = (data: SocketEventData['user_typing']) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (data.typing) {
          newMap.set(data.user_id, data.full_name);
        } else {
          newMap.delete(data.user_id);
        }
        return newMap;
      });

      // Auto-clear typing indicator after 5 seconds
      if (data.typing) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.user_id);
            return newMap;
          });
        }, 5000);
      }
    };

    const handleUserJoined = (data: SocketEventData['user_joined']) => {
      setOnlineUsers(prev => new Set(prev).add(data.user_id));
    };

    const handleUserLeft = (data: SocketEventData['user_left']) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
    };

    const handleUserOffline = (data: SocketEventData['user_offline']) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
    };

    const handleError = (error: SocketEventData['error']) => {
      console.error("❌ Socket error:", error);
    };

    // Add event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_offline', handleUserOffline);
    socket.on('error', handleError);

    // Cleanup
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_offline', handleUserOffline);
      socket.off('error', handleError);
    };
  }, []);

  // Reset states when new events come in
  useEffect(() => {
    if (newMessage) {
      const timer = setTimeout(() => setNewMessage(null), 100);
      return () => clearTimeout(timer);
    }
  }, [newMessage]);

  useEffect(() => {
    if (messageSent) {
      const timer = setTimeout(() => setMessageSent(null), 100);
      return () => clearTimeout(timer);
    }
  }, [messageSent]);

  return {
    newMessage,
    messageSent,
    typingUsers,
    onlineUsers,
    clearNewMessage: () => setNewMessage(null),
    clearMessageSent: () => setMessageSent(null)
  };
};

// ==================== TYPING INDICATOR HOOK ====================

export const useTypingIndicator = (conversationId: string, delay = 2000) => {
  const { startTyping, stopTyping } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      startTyping(conversationId);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        stopTyping(conversationId);
        isTypingRef.current = false;
      }
    }, delay);
  }, [conversationId, startTyping, stopTyping, delay]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTypingRef.current) {
      stopTyping(conversationId);
      isTypingRef.current = false;
    }
  }, [conversationId, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        stopTyping(conversationId);
      }
    };
  }, [conversationId, stopTyping]);

  return {
    startTyping: handleTypingStart,
    stopTyping: handleTypingStop,
    isTyping: isTypingRef.current
  };
};