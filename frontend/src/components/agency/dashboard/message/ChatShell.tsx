"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  useConversations,
  useMessages,
  useSendMessage,
} from "../../../../lib/message/message.queries";
import {
  initializeSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  sendSocketMessage,
} from "../../../../lib/message/socket.client";
import {
  Message,
  Conversation,
  LegacyMessage,
  LegacyConversation,
  convertToLegacyConversation,
  convertToLegacyMessage,
} from "../../../../types/message.types";
import ChatSidebar from "../../../candidate/dashboard/message/ChatSidebar";
import ChatWindow from "../../../candidate/dashboard/message/ChatWindow";

const ChatShell: React.FC = () => {
  const { user, token } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      initializeSocket(token);
      return () => {
        disconnectSocket();
      };
    }
  }, [token, user?.full_name]);

  const {
    data: conversationsResponse,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useConversations();

  const { data: messagesResponse } = useMessages(selectedChatId || "", 1, 50);

  const sendMessageMutation = useSendMessage();

  const conversations: Conversation[] = conversationsResponse?.success
    ? conversationsResponse.data
    : [];

  useEffect(() => {
    if (messagesResponse?.success && selectedChatId) {
      const sortedMessages = [...messagesResponse.data].sort(
        (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );
      setMessages(sortedMessages);
    }
  }, [messagesResponse, selectedChatId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("new_message", (newMessage: Message) => {
      if (newMessage.conversation_id === selectedChatId) {
        setMessages((prev) => [...prev, newMessage]);
      }
      refetchConversations();
    });

    socket.on("message_sent", (message: Message) => {
      if (message.conversation_id === selectedChatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.message_id === message.message_id);
          return exists ? prev : [...prev, message];
        });
      }
      refetchConversations();
    });

    socket.on("user_typing", (data: { user_id: string; full_name: string; conversation_id: string; typing: boolean }) => {
      if (data.conversation_id === selectedChatId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          data.typing ? newSet.add(data.user_id) : newSet.delete(data.user_id);
          return newSet;
        });
      }
    });

    socket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error);
    });

    socket.on("reaction_added", (data: { message_id: string; reaction: any }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === data.message_id && msg.conversation_id === selectedChatId) {
            return { ...msg, reactions: [...(msg.reactions || []), data.reaction] };
          }
          return msg;
        })
      );
      refetchConversations();
    });

    socket.on("reaction_removed", (data: { message_id: string; user_id: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === data.message_id && msg.conversation_id === selectedChatId) {
            return { ...msg, reactions: (msg.reactions || []).filter((r) => r.user_id !== data.user_id) };
          }
          return msg;
        })
      );
      refetchConversations();
    });

    socket.on("message_deleted", (data: { message_id: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.message_id !== data.message_id));
      refetchConversations();
    });

    return () => {
      socket.off("new_message");
      socket.off("message_sent");
      socket.off("user_typing");
      socket.off("error");
      socket.off("reaction_added");
      socket.off("reaction_removed");
      socket.off("message_deleted");
    };
  }, [selectedChatId, refetchConversations]);

  const handleSelectChat = (id: string | number) => {
    const conversationId = String(id);
    if (selectedChatId && selectedChatId !== conversationId) {
      leaveConversation(selectedChatId);
    }
    setSelectedChatId(conversationId);
    joinConversation(conversationId);
    setTypingUsers(new Set());
  };

  const handleBack = () => {
    if (selectedChatId) leaveConversation(selectedChatId);
    setSelectedChatId(null);
    setMessages([]);
    setTypingUsers(new Set());
  };

  const handleSendMessage = (chatId: string | number, newMessage: LegacyMessage) => {
    if (!selectedChatId || !user) return;
    sendSocketMessage({
      conversation_id: selectedChatId,
      content: newMessage.text,
      message_type: newMessage.type,
      file_url: newMessage.type !== "text" ? newMessage.text : undefined,
      file_name: newMessage.fileName,
    });
  };

  const legacyConversations: LegacyConversation[] = conversations.map((conv) =>
    convertToLegacyConversation(conv, [], user?.user_id || "")
  );

  const legacyMessages: LegacyMessage[] = messages.map((msg) =>
    convertToLegacyMessage(msg, user?.user_id || "")
  );

  const selectedChat = legacyConversations.find((c) => c.id === selectedChatId) || null;
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
