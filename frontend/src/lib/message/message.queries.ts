// src/lib/message/message.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  archiveConversation,
  deleteMessage,
  getConversationById,
  MessageAPIResponse,
  addReaction,     
  removeReaction,    
  getReactions,   
} from './message.api';

// ==================== QUERY KEYS ====================
export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...messageKeys.all, 'conversation', id] as const,
  messages: (conversationId: string) => [...messageKeys.all, 'messages', conversationId] as const,
  archivedConversations: () => [...messageKeys.all, 'conversations', 'archived'] as const
};

// ==================== CONVERSATIONS ====================

export const useConversations = (archived = false) => {
  return useQuery({
    queryKey: archived ? messageKeys.archivedConversations() : messageKeys.conversations(),
    queryFn: () => getConversations(archived),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
};

export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => getConversationById(conversationId),
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createConversation,
    onSuccess: (data, variables) => {
      console.log("✅ Conversation created successfully:", data);
      
      // Invalidate conversations to refresh the list
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations()
      });
      
      // Optionally set the conversation data in cache
      if (data?.success && data?.data?.conversation_id) {
        queryClient.setQueryData(
          messageKeys.conversation(data.data.conversation_id),
          data
        );
      }
    },
    onError: (error) => {
      console.error('Create conversation mutation error:', error);
    }
  });
};

// ==================== MESSAGES ====================

export const useMessages = (conversationId: string, page = 1, limit = 50) => {
  return useQuery({
    queryKey: [...messageKeys.messages(conversationId), page, limit],
    queryFn: () => getMessages(conversationId, page, limit),
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, data }: {
      conversationId: string;
      data: {
        content?: string;
        message_type?: string;
        reply_to_id?: string;
        file_url?: string;
        file_name?: string;
        file_size?: number;
      };
    }) => sendMessage(conversationId, data),
    onMutate: async ({ conversationId, data }) => {
      // Optimistic update
      console.log("🔄 Optimistic message update for:", conversationId);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: messageKeys.messages(conversationId) 
      });
    },
    onSuccess: (data, variables) => {
      console.log("✅ Message sent successfully:", data);
      
      // Invalidate and refetch messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(variables.conversationId)
      });
      
      // Invalidate conversations to update last message and unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations()
      });
    },
    onError: (error, variables) => {
      console.error('Send message mutation error:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(variables.conversationId)
      });
    }
  });
};

// ==================== MESSAGE ACTIONS ====================

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markMessagesAsRead,
    onSuccess: (data, variables) => {
      console.log("✅ Messages marked as read:", variables);
      
      // Invalidate conversations to update unread counts
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations()
      });
      
      // Invalidate messages to update read status
      queryClient.invalidateQueries({
        queryKey: messageKeys.all
      });
    },
    onError: (error) => {
      console.error('Mark as read mutation error:', error);
    }
  });
};

export const useArchiveConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, isArchived }: {
      conversationId: string;
      isArchived: boolean;
    }) => archiveConversation(conversationId, isArchived),
    onSuccess: (data, variables) => {
      console.log(`✅ Conversation ${variables.isArchived ? 'archived' : 'unarchived'}:`, variables.conversationId);
      
      // Invalidate both active and archived conversations
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations()
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.archivedConversations()
      });
      
      // Invalidate specific conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(variables.conversationId)
      });
    },
    onError: (error) => {
      console.error('Archive conversation mutation error:', error);
    }
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: (data, variables) => {
      console.log("✅ Message deleted:", variables);
      
      // Invalidate all message-related queries to refresh
      queryClient.invalidateQueries({
        queryKey: messageKeys.all
      });
    },
    onError: (error) => {
      console.error('Delete message mutation error:', error);
    }
  });
};

// ==================== HELPER HOOKS ====================

export const useRefreshConversations = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: messageKeys.conversations()
    });
  };
};

export const useRefreshMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: messageKeys.messages(conversationId)
    });
  };
};

// ==================== PREFETCH HELPERS ====================

export const usePrefetchConversation = () => {
  const queryClient = useQueryClient();
  
  return (conversationId: string) => {
    queryClient.prefetchQuery({
      queryKey: messageKeys.conversation(conversationId),
      queryFn: () => getConversationById(conversationId),
      staleTime: 2 * 60 * 1000
    });
  };
};

export const usePrefetchMessages = () => {
  const queryClient = useQueryClient();
  
  return (conversationId: string) => {
    queryClient.prefetchQuery({
      queryKey: messageKeys.messages(conversationId),
      queryFn: () => getMessages(conversationId, 1, 20),
      staleTime: 2 * 60 * 1000
    });
  };
};


// ==================== REACTIONS ====================

export const useAddReaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => 
      addReaction(messageId, emoji),
    onSuccess: (data, variables) => {
      console.log("✅ Reaction added successfully:", data);
      
      // Invalidate messages to refresh reactions
      queryClient.invalidateQueries({
        queryKey: messageKeys.all
      });
    },
    onError: (error) => {
      console.error('Add reaction mutation error:', error);
    }
  });
};

export const useRemoveReaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ messageId }: { messageId: string }) => 
      removeReaction(messageId),
    onSuccess: (data, variables) => {
      console.log("✅ Reaction removed successfully:", data);
      
      // Invalidate messages to refresh reactions
      queryClient.invalidateQueries({
        queryKey: messageKeys.all
      });
    },
    onError: (error) => {
      console.error('Remove reaction mutation error:', error);
    }
  });
};

export const useReactions = (messageId: string) => {
  return useQuery({
    queryKey: [...messageKeys.all, 'reactions', messageId],
    queryFn: () => getReactions(messageId),
    enabled: !!messageId,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1
  });
};
