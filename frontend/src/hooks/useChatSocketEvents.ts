// src/hooks/useChatSocketEvents.ts
//
// Single source of truth for the per-conversation Socket.io listeners used by the
// candidate/company/agency ChatShells. Previously each shell duplicated the same
// listener block; consolidating here keeps the realtime contract in one place.
//
// Handles: new_message, message_sent, user_typing, error, reaction_added,
// reaction_removed, message_deleted, and message_read (read-receipts). It also
// emits mark_messages_read for inbound unread messages while a conversation is open.

import { useEffect } from 'react';
import { getSocket, markSocketRead } from '../lib/message/socket.client';
import type { Message, MessageReaction } from '../types/message.types';

interface UseChatSocketEventsParams {
  selectedChatId: string | null;
  currentUserId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
  refetchConversations: () => void;
}

export const useChatSocketEvents = ({
  selectedChatId,
  currentUserId,
  messages,
  setMessages,
  setTypingUsers,
  refetchConversations,
}: UseChatSocketEventsParams): void => {
  // ── Register/cleanup listeners (keyed on the open conversation) ─────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.conversation_id === selectedChatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.message_id === newMessage.message_id);
          return exists ? prev : [...prev, newMessage];
        });
      }
      refetchConversations();
    };

    const handleMessageSent = (message: Message) => {
      if (message.conversation_id === selectedChatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.message_id === message.message_id);
          return exists ? prev : [...prev, message];
        });
      }
      refetchConversations();
    };

    const handleUserTyping = (data: {
      user_id: string;
      full_name: string;
      conversation_id: string;
      typing: boolean;
    }) => {
      if (data.conversation_id === selectedChatId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (data.typing) next.add(data.user_id);
          else next.delete(data.user_id);
          return next;
        });
      }
    };

    const handleError = (error: { message: string; error?: string }) => {
      console.error('❌ Socket error:', error);
    };

    const handleReactionAdded = (data: { message_id: string; reaction: MessageReaction }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === data.message_id && msg.conversation_id === selectedChatId
            ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
            : msg
        )
      );
      refetchConversations();
    };

    const handleReactionRemoved = (data: { message_id: string; user_id: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === data.message_id && msg.conversation_id === selectedChatId
            ? { ...msg, reactions: (msg.reactions || []).filter((r) => r.user_id !== data.user_id) }
            : msg
        )
      );
      refetchConversations();
    };

    const handleMessageDeleted = (data: { message_id: string; deleted_by?: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.message_id !== data.message_id));
      refetchConversations();
    };

    // Read-receipt: the other participant read our message → flip is_read so the
    // sender's bubble can show the "read" (double-check) indicator.
    const handleMessageRead = (data: { message_id: string; read_by: string; read_at: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === data.message_id
            ? { ...msg, is_read: true, read_at: data.read_at }
            : msg
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleUserTyping);
    socket.on('error', handleError);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleUserTyping);
      socket.off('error', handleError);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_read', handleMessageRead);
    };
  }, [selectedChatId, currentUserId, setMessages, setTypingUsers, refetchConversations]);

  // ── Emit read-receipts for inbound unread messages while viewing ────────────
  useEffect(() => {
    if (!selectedChatId || !currentUserId) return;

    const unreadInbound = messages
      .filter((m) => m.sender_id !== currentUserId && !m.is_read)
      .map((m) => m.message_id);

    if (unreadInbound.length === 0) return;

    markSocketRead(unreadInbound, selectedChatId);

    // Optimistically flip locally so this effect converges (no re-emit loop) — the
    // read-receipt indicator only renders on our OWN messages, so this is invisible
    // for inbound bubbles.
    setMessages((prev) =>
      prev.map((m) =>
        unreadInbound.includes(m.message_id) ? { ...m, is_read: true } : m
      )
    );
  }, [messages, selectedChatId, currentUserId, setMessages]);
};
