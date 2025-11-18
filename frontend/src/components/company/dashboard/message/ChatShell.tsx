"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { 
  useConversations, 
  useMessages, 
  useSendMessage 
} from "../../../../lib/message/message.queries";
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
  joinConversation,
  leaveConversation,
  sendSocketMessage
} from "../../../../lib/message/socket.client";
import { 
  Message, 
  Conversation, 
  LegacyMessage,
  LegacyConversation,
  convertToLegacyConversation,
  convertToLegacyMessage
} from "../../../../types/message.types";
import ChatSidebar from "../../../candidate/dashboard/message/ChatSidebar";
import ChatWindow from "../../../candidate/dashboard/message/ChatWindow";

const ChatShell: React.FC = () => {
  const { user, token } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Initialize Socket.io
  useEffect(() => {
    if (token) {
      console.log("🔌 Initializing socket for company:", user?.full_name);
      initializeSocket(token);

      return () => {
        disconnectSocket();
      };
    }
  }, [token, user?.full_name]);

  // Fetch conversations
  const { 
    data: conversationsResponse, 
    isLoading: isLoadingConversations,
    refetch: refetchConversations 
  } = useConversations();
  
  // Fetch messages for selected conversation
  const { 
    data: messagesResponse, 
    isLoading: isLoadingMessages 
  } = useMessages(selectedChatId || '', 1, 50);

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  const conversations: Conversation[] = conversationsResponse?.success 
    ? conversationsResponse.data 
    : [];

  // Update messages when API response changes
  useEffect(() => {
    if (messagesResponse?.success && selectedChatId) {
      setMessages(messagesResponse.data.reverse()); // Reverse to show oldest first
    }
  }, [messagesResponse, selectedChatId]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Handle new messages
    socket.on('new_message', (newMessage: Message) => {
      console.log("📨 Received new message:", newMessage);
      
      if (newMessage.conversation_id === selectedChatId) {
        setMessages(prev => [...prev, newMessage]);
      }
      
      // Refresh conversations to update last message
      refetchConversations();
    });

    // Handle message sent confirmation
    socket.on('message_sent', (message: Message) => {
      console.log("✅ Message sent confirmed:", message);
      
      if (message.conversation_id === selectedChatId) {
        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.some(m => m.message_id === message.message_id);
          return exists ? prev : [...prev, message];
        });
      }
      
      refetchConversations();
    });

    // Handle typing indicators
    socket.on('user_typing', (data: { 
      user_id: string; 
      full_name: string; 
      conversation_id: string; 
      typing: boolean; 
    }) => {
      if (data.conversation_id === selectedChatId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.typing) {
            newSet.add(data.user_id);
          } else {
            newSet.delete(data.user_id);
          }
          return newSet;
        });
      }
    });

    // Error handling
    socket.on('error', (error: { message: string; error?: string }) => {
      console.error("❌ Socket error:", error);
    });

    // Cleanup listeners
    return () => {
      socket.off('new_message');
      socket.off('message_sent');
      socket.off('user_typing');
      socket.off('error');
    };
  }, [selectedChatId, refetchConversations]);

  const handleSelectChat = (id: string | number) => {
    const conversationId = String(id);
    
    // Leave previous conversation
    if (selectedChatId) {
      leaveConversation(selectedChatId);
    }

    // Set new conversation
    setSelectedChatId(conversationId);
    
    // Join new conversation
    joinConversation(conversationId);
    
    // Clear previous data
    setMessages([]);
    setTypingUsers(new Set());
  };

  const handleBack = () => {
    if (selectedChatId) {
      leaveConversation(selectedChatId);
    }
    setSelectedChatId(null);
    setMessages([]);
    setTypingUsers(new Set());
  };

  const handleSendMessage = (chatId: string | number, newMessage: LegacyMessage) => {
    if (!selectedChatId || !user) return;

    // Send via Socket.io for real-time
    sendSocketMessage({
      conversation_id: selectedChatId,
      content: newMessage.text,
      message_type: newMessage.type,
      file_url: newMessage.type !== 'text' ? newMessage.text : undefined,
      file_name: newMessage.fileName
    });
  };

  // Convert backend conversations to legacy format for existing components
  const legacyConversations: LegacyConversation[] = conversations.map(conv => 
    convertToLegacyConversation(conv, [], user?.user_id || '')
  );

  // Convert backend messages to legacy format
  const legacyMessages: LegacyMessage[] = messages.map(msg =>
    convertToLegacyMessage(msg, user?.user_id || '')
  );

  // Find selected conversation in legacy format
  const selectedChat = legacyConversations.find(c => c.id === selectedChatId) || null;
  
  // If we have a selected chat, update its messages
  if (selectedChat) {
    selectedChat.messages = legacyMessages;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Please log in to access messages</div>
      </div>
    );
  }

  if (isLoadingConversations) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="w-full lg:max-w-5xl 2xl:max-w-3/4 flex h-[100vh] 2xl:h-[calc(100vh-200px)] rounded-xl overflow-hidden bg-white">
      {/* Sidebar */}
      <div
        className={`w-full sm:w-1/3 md:w-xs 2xl:w-xl border-r border-gray-100 transition-all duration-300 ${
          selectedChatId ? "hidden sm:flex" : "flex"
        }`}
      >
        <ChatSidebar
          conversations={legacyConversations}
          activeId={selectedChatId}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`flex-1 transition-all duration-300 ${
          selectedChatId ? "flex" : "hidden sm:flex"
        }`}
      >
        <ChatWindow
          conversation={selectedChat}
          onBack={handleBack}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default ChatShell;