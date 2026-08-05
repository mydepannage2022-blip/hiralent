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
import { useChatSocketEvents } from "../../../../hooks/useChatSocketEvents";
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

  useEffect(() => {
    if (messagesResponse?.success && selectedChatId) {
      // Messages come in descending order (newest first), reverse to show oldest first
      const sortedMessages = [...messagesResponse.data].sort((a, b) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );
      setMessages(sortedMessages);
    } else if (!messagesResponse && selectedChatId) {
      // Keep previous messages while loading
    }
  }, [messagesResponse, selectedChatId]);

  // All per-conversation socket listeners + read-receipt emit live in one shared hook.
  useChatSocketEvents({
    selectedChatId,
    currentUserId: user?.user_id || '',
    messages,
    setMessages,
    setTypingUsers,
    refetchConversations,
  });

const handleSelectChat = (id: string | number) => {
  const conversationId = String(id);
  
  // Leave previous conversation
  if (selectedChatId && selectedChatId !== conversationId) {
    leaveConversation(selectedChatId);
  }

  setSelectedChatId(conversationId);
  
  joinConversation(conversationId);
  
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