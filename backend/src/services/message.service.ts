import prisma from "../lib/prisma";
import { 
  CreateConversationInput, 
  SendMessageInput, 
  GetMessagesQuery, 
  MarkReadInput,
  ArchiveConversationInput,
  MessageResponse,
  ConversationResponse,
  MessageType
} from "../validation/message.schema";

/**
 * Get all conversations for a user
 */
export const getConversations = async (userId: string, archived: boolean = false): Promise<ConversationResponse[]> => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { 
            participant_1_id: userId,
            is_archived_p1: archived
          },
          { 
            participant_2_id: userId,
            is_archived_p2: archived
          }
        ]
      },
      include: {
        participant_1: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        },
        participant_2: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        },
        messages: {
          orderBy: { sent_at: 'desc' },
          take: 1,
          select: {
            message_id: true,
            content: true,
            message_type: true,
            sender_id: true,
            sent_at: true,
            is_read: true
          }
        }
      },
      orderBy: { last_message_at: 'desc' }
    });

    return conversations.map(conv => {
      const otherParticipant = conv.participant_1_id === userId 
        ? conv.participant_2 
        : conv.participant_1;

      const unreadCount = conv.participant_1_id === userId
        ? conv.unread_count_p1
        : conv.unread_count_p2;

      const isArchived = conv.participant_1_id === userId
        ? conv.is_archived_p1
        : conv.is_archived_p2;

      return {
        conversation_id: conv.conversation_id,
        participant_1_id: conv.participant_1_id,
        participant_2_id: conv.participant_2_id,
        last_message_at: conv.last_message_at,
        last_message_id: conv.last_message_id,
        unread_count: unreadCount,
        is_archived: isArchived,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        other_participant: {
          user_id: otherParticipant.user_id,
          full_name: otherParticipant.full_name,
          profile_picture_url: otherParticipant.candidateProfile?.profile_picture_url || null,
          role: otherParticipant.role,
          is_online: false,
          last_seen: null
        },
        last_message: conv.messages[0] ? {
          message_id: conv.messages[0].message_id,
          content: conv.messages[0].content,
          message_type: conv.messages[0].message_type as MessageType,
          sender_id: conv.messages[0].sender_id,
          sent_at: conv.messages[0].sent_at,
          is_read: conv.messages[0].is_read
        } : null
      };
    });

  } catch (error) {
    throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create a new conversation or get existing one
 */
export const createConversation = async (userId: string, input: CreateConversationInput): Promise<{ conversation_id: string }> => {
  try {
    const { participant_id, initial_message } = input;

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant_1_id: userId, participant_2_id: participant_id },
          { participant_1_id: participant_id, participant_2_id: userId }
        ]
      }
    });

    if (existingConversation) {
      return { conversation_id: existingConversation.conversation_id };
    }

    // Verify other participant exists
    const otherParticipant = await prisma.user.findUnique({
      where: { user_id: participant_id },
      select: { user_id: true }
    });

    if (!otherParticipant) {
      throw new Error("Participant not found");
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participant_1_id: userId,
        participant_2_id: participant_id,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Send initial message if provided
    if (initial_message) {
      await sendMessage(userId, conversation.conversation_id, {
        content: initial_message,
        message_type: "text"
      });
    }

    return { conversation_id: conversation.conversation_id };

  } catch (error) {
    throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (userId: string, conversationId: string, input: SendMessageInput): Promise<MessageResponse> => {
  try {
    // Verify conversation exists and user is participant
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        OR: [
          { participant_1_id: userId },
          { participant_2_id: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Verify reply_to message exists if provided
    if (input.reply_to_id) {
      const replyToMessage = await prisma.message.findFirst({
        where: {
          message_id: input.reply_to_id,
          conversation_id: conversationId,
          is_deleted: false
        }
      });

      if (!replyToMessage) {
        throw new Error("Reply to message not found");
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_id: userId,
        content: input.content || null,
        reply_to_id: input.reply_to_id || null,
        message_type: input.message_type || "text",
        file_url: input.file_url || null,
        file_name: input.file_name || null,
        file_size: input.file_size || null,
        sent_at: new Date()
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        },
        reply_to: {
          select: {
            message_id: true,
            content: true,
            message_type: true,
            sender: {
              select: { full_name: true }
            }
          }
        }
      }
    });

    // Update conversation last_message info and unread count
    const otherParticipantId = conversation.participant_1_id === userId 
      ? conversation.participant_2_id 
      : conversation.participant_1_id;

    await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: {
        last_message_at: new Date(),
        last_message_id: message.message_id,
        unread_count_p1: conversation.participant_1_id === otherParticipantId 
          ? { increment: 1 } 
          : conversation.unread_count_p1,
        unread_count_p2: conversation.participant_2_id === otherParticipantId 
          ? { increment: 1 } 
          : conversation.unread_count_p2,
        updated_at: new Date()
      }
    });

    // Format response
    return {
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      reply_to_id: message.reply_to_id,
      message_type: message.message_type as MessageType,
      file_url: message.file_url,
      file_name: message.file_name,
      file_size: message.file_size,
      is_read: message.is_read,
      is_deleted: message.is_deleted,
      sent_at: message.sent_at,
      read_at: message.read_at,
      sender: {
        user_id: message.sender.user_id,
        full_name: message.sender.full_name,
        profile_picture_url: message.sender.candidateProfile?.profile_picture_url || null,
        role: message.sender.role
      },
      reply_to: message.reply_to ? {
        message_id: message.reply_to.message_id,
        content: message.reply_to.content,
        sender_name: message.reply_to.sender?.full_name || 'Unknown',
        message_type: message.reply_to.message_type as MessageType
      } : null
    };

  } catch (error) {
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get messages from a conversation with pagination
 */
export const getMessages = async (userId: string, conversationId: string, query: GetMessagesQuery): Promise<MessageResponse[]> => {
  try {
    // Verify conversation exists and user is participant
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        OR: [
          { participant_1_id: userId },
          { participant_2_id: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const { page, limit, before_message_id } = query;
    const skip = (page - 1) * limit;

    let whereClause: any = {
      conversation_id: conversationId,
      is_deleted: false
    };

    // Cursor-based pagination if before_message_id provided
    if (before_message_id) {
      const beforeMessage = await prisma.message.findUnique({
        where: { message_id: before_message_id },
        select: { sent_at: true }
      });

      if (beforeMessage) {
        whereClause.sent_at = {
          lt: beforeMessage.sent_at
        };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { sent_at: 'desc' },
      take: limit,
      skip: before_message_id ? 0 : skip,
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        },
        reply_to: {
          select: {
            message_id: true,
            content: true,
            message_type: true,
            sender: {
              select: { full_name: true }
            }
          }
        }
      }
    });

    return messages.map(message => ({
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      reply_to_id: message.reply_to_id,
      message_type: message.message_type as MessageType,
      file_url: message.file_url,
      file_name: message.file_name,
      file_size: message.file_size,
      is_read: message.is_read,
      is_deleted: message.is_deleted,
      sent_at: message.sent_at,
      read_at: message.read_at,
      sender: {
        user_id: message.sender.user_id,
        full_name: message.sender.full_name,
        profile_picture_url: message.sender.candidateProfile?.profile_picture_url || null,
        role: message.sender.role
      },
      reply_to: message.reply_to ? {
        message_id: message.reply_to.message_id,
        content: message.reply_to.content,
        sender_name: message.reply_to.sender?.full_name || 'Unknown',
        message_type: message.reply_to.message_type as MessageType
      } : null
    }));

  } catch (error) {
    throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (userId: string, input: MarkReadInput): Promise<{ updated_count: number }> => {
  try {
    const { message_ids } = input;

    // Update messages where user is the recipient (not sender)
    const result = await prisma.message.updateMany({
      where: {
        message_id: { in: message_ids },
        sender_id: { not: userId },
        is_read: false,
        conversation: {
          OR: [
            { participant_1_id: userId },
            { participant_2_id: userId }
          ]
        }
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    // Update unread counts in conversations
    const conversations = await prisma.message.findMany({
      where: {
        message_id: { in: message_ids },
        sender_id: { not: userId }
      },
      select: {
        conversation_id: true,
        conversation: {
          select: {
            participant_1_id: true,
            participant_2_id: true
          }
        }
      },
      distinct: ['conversation_id']
    });

    for (const msg of conversations) {
      const isParticipant1 = msg.conversation.participant_1_id === userId;
      await prisma.conversation.update({
        where: { conversation_id: msg.conversation_id },
        data: {
          unread_count_p1: isParticipant1 
            ? { decrement: result.count }
            : undefined,
          unread_count_p2: !isParticipant1 
            ? { decrement: result.count }
            : undefined
        }
      });
    }

    return { updated_count: result.count };

  } catch (error) {
    throw new Error(`Failed to mark messages as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Archive or unarchive a conversation
 */
export const archiveConversation = async (userId: string, conversationId: string, input: ArchiveConversationInput): Promise<{ success: boolean }> => {
  try {
    // Verify conversation exists and user is participant
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        OR: [
          { participant_1_id: userId },
          { participant_2_id: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const { is_archived } = input;
    const isParticipant1 = conversation.participant_1_id === userId;

    await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: {
        is_archived_p1: isParticipant1 ? is_archived : conversation.is_archived_p1,
        is_archived_p2: !isParticipant1 ? is_archived : conversation.is_archived_p2,
        updated_at: new Date()
      }
    });

    return { success: true };

  } catch (error) {
    throw new Error(`Failed to archive conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (userId: string, messageId: string): Promise<{ success: boolean }> => {
  try {
    // Verify message exists and user is sender
    const message = await prisma.message.findFirst({
      where: {
        message_id: messageId,
        sender_id: userId,
        is_deleted: false
      }
    });

    if (!message) {
      throw new Error("Message not found or access denied");
    }

    await prisma.message.update({
      where: { message_id: messageId },
      data: {
        is_deleted: true,
        content: null // Clear content for privacy
      }
    });

    return { success: true };

  } catch (error) {
    throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get conversation by ID (with participant info)
 */
export const getConversationById = async (userId: string, conversationId: string): Promise<ConversationResponse> => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        conversation_id: conversationId,
        OR: [
          { participant_1_id: userId },
          { participant_2_id: userId }
        ]
      },
      include: {
        participant_1: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        },
        participant_2: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            candidateProfile: {
              select: {
                profile_picture_url: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const otherParticipant = conversation.participant_1_id === userId 
      ? conversation.participant_2 
      : conversation.participant_1;

    const unreadCount = conversation.participant_1_id === userId
      ? conversation.unread_count_p1
      : conversation.unread_count_p2;

    const isArchived = conversation.participant_1_id === userId
      ? conversation.is_archived_p1
      : conversation.is_archived_p2;

    return {
      conversation_id: conversation.conversation_id,
      participant_1_id: conversation.participant_1_id,
      participant_2_id: conversation.participant_2_id,
      last_message_at: conversation.last_message_at,
      last_message_id: conversation.last_message_id,
      unread_count: unreadCount,
      is_archived: isArchived,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      other_participant: {
        user_id: otherParticipant.user_id,
        full_name: otherParticipant.full_name,
        profile_picture_url: otherParticipant.candidateProfile?.profile_picture_url || null,
        role: otherParticipant.role,
        is_online: false,
        last_seen: null
      },
      last_message: null // Can be populated separately if needed
    };

  } catch (error) {
    throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};