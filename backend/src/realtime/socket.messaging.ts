import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyTokenWithDetails } from '../utils/jwt.util';
import * as blacklistService from '../services/auth/blacklist.service';
import * as sessionService from '../services/auth/session.service';
import * as messageService from '../services/message.service';
import { MessageType } from '../validation/message.schema';
import { getFrontendUrl } from '../config/appUrls';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userData?: {
    user_id: string;
    full_name: string;
    role: string;
  };
}

export const setupSocketIO = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: getFrontendUrl(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io — mirrors checkAuth (Wave 1 / Phase 1.2):
  // mandatory blacklist check, session_id required, and the session must still be
  // active + unexpired. Without these, a logged-out / terminated / session-less token
  // could still open a realtime connection.
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // 1) Revocation check — a logged-out / terminated token is blacklisted.
      if (await blacklistService.isTokenBlacklisted(token)) {
        return next(new Error('Session terminated'));
      }

      // 2) Signature + expiry.
      const { payload, error } = verifyTokenWithDetails(token);
      if (error || !payload) {
        return next(new Error('Invalid token'));
      }

      // 3) Must carry a session_id (no 'bypass') ...
      if (!payload.session_id) {
        return next(new Error('Active session required'));
      }

      // 4) ... and that session must still be active + unexpired in the DB.
      if (!(await sessionService.validateSession(payload.session_id, payload.user_id))) {
        return next(new Error('Session expired or terminated'));
      }

      socket.userId = payload.user_id;
      socket.userData = {
        user_id: payload.user_id,
        full_name: payload.full_name,
        role: payload.role
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    console.log(`User ${authenticatedSocket.userData?.full_name} connected:`, socket.id);

    // Join user to their personal room (for notifications)
    socket.join(`user_${authenticatedSocket.userId}`);

    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      try {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${authenticatedSocket.userId} joined conversation ${conversationId}`);
        
        // Notify others in conversation that user is online
        socket.to(`conversation_${conversationId}`).emit('user_joined', {
          user_id: authenticatedSocket.userId,
          full_name: authenticatedSocket.userData?.full_name,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      try {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${authenticatedSocket.userId} left conversation ${conversationId}`);
        
        // Notify others that user left
        socket.to(`conversation_${conversationId}`).emit('user_left', {
          user_id: authenticatedSocket.userId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error leaving conversation:', error);
      }
    });

    // Send message (real-time)
    socket.on('send_message', async (data: {
      conversation_id: string;
      content?: string;
      message_type?: MessageType;
      reply_to_id?: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
    }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Save message to database
        const message = await messageService.sendMessage(authenticatedSocket.userId, data.conversation_id, {
          content: data.content,
          message_type: data.message_type || 'text',
          reply_to_id: data.reply_to_id,
          file_url: data.file_url,
          file_name: data.file_name,
          file_size: data.file_size
        });

        // Broadcast to conversation room
        socket.to(`conversation_${data.conversation_id}`).emit('new_message', message);
        
        // Send confirmation back to sender
        socket.emit('message_sent', message);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { 
          message: 'Failed to send message',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Typing indicators
    socket.on('typing_start', (data: { conversation_id: string }) => {
      socket.to(`conversation_${data.conversation_id}`).emit('user_typing', {
        user_id: authenticatedSocket.userId,
        full_name: authenticatedSocket.userData?.full_name,
        conversation_id: data.conversation_id,
        typing: true
      });
    });

    socket.on('typing_stop', (data: { conversation_id: string }) => {
      socket.to(`conversation_${data.conversation_id}`).emit('user_typing', {
        user_id: authenticatedSocket.userId,
        full_name: authenticatedSocket.userData?.full_name,
        conversation_id: data.conversation_id,
        typing: false
      });
    });

    // Mark messages as read
    socket.on('mark_messages_read', async (data: { message_ids: string[]; conversation_id?: string }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const result = await messageService.markMessagesAsRead(authenticatedSocket.userId, {
          message_ids: data.message_ids
        });

        // Notify sender(s) that their messages were read. Scope the receipt to the
        // conversation room (like reactions/deletes) instead of a global broadcast so
        // only the participants — not every connected client — see the read event.
        // Only emit when the DB actually flipped something: markMessagesAsRead already
        // filters to messages the caller RECEIVED in a conversation they belong to, so
        // updated_count === 0 means a replay / wrong-conversation / non-recipient call —
        // emitting there would leak foreign message ids and fire false read-receipts.
        if (result.updated_count > 0) {
          const readAt = new Date();
          for (const messageId of data.message_ids) {
            const payload = {
              message_id: messageId,
              read_by: authenticatedSocket.userId,
              read_at: readAt
            };
            if (data.conversation_id) {
              io.to(`conversation_${data.conversation_id}`).emit('message_read', payload);
            } else {
              // Backward-compatible fallback for callers that don't pass a conversation_id.
              socket.broadcast.emit('message_read', payload);
            }
          }
        }

        socket.emit('messages_marked_read', result);

      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { 
          message: 'Failed to mark messages as read',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

        // Add reaction to message
    socket.on('add_reaction', async (data: {
      message_id: string;
      conversation_id: string;
      emoji: string;
    }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        console.log('🔥 Socket: add_reaction received', data);

        // Save to database
        const reaction = await messageService.addReaction(
          data.message_id,
          authenticatedSocket.userId,
          data.emoji
        );

        console.log('✅ Socket: Reaction saved, broadcasting...', reaction);

        // Broadcast to everyone in conversation (including sender)
        io.to(`conversation_${data.conversation_id}`).emit('reaction_added', {
          message_id: data.message_id,
          reaction: reaction
        });

        // Confirmation to sender
        socket.emit('reaction_added_success', reaction);

      } catch (error) {
        console.error('❌ Socket: Error adding reaction:', error);
        socket.emit('error', { 
          message: 'Failed to add reaction',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Remove reaction from message
    socket.on('remove_reaction', async (data: {
      message_id: string;
      conversation_id: string;
    }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        console.log('🗑️ Socket: remove_reaction received', data);

        // Remove from database
        await messageService.removeReaction(
          data.message_id,
          authenticatedSocket.userId
        );

        console.log('✅ Socket: Reaction removed, broadcasting...');

        // Broadcast to everyone in conversation
        io.to(`conversation_${data.conversation_id}`).emit('reaction_removed', {
          message_id: data.message_id,
          user_id: authenticatedSocket.userId
        });

        // Confirmation to sender
        socket.emit('reaction_removed_success', { message_id: data.message_id });

      } catch (error) {
        console.error('❌ Socket: Error removing reaction:', error);
        socket.emit('error', {
          message: 'Failed to remove reaction',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Delete message
    socket.on('delete_message', async (data: {
      message_id: string;
      conversation_id: string;
    }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        console.log('🗑️ Socket: delete_message received', data);

        // Delete from database
        await messageService.deleteMessage(authenticatedSocket.userId, data.message_id);

        console.log('✅ Socket: Message deleted, broadcasting...');

        // Broadcast to everyone in conversation
        io.to(`conversation_${data.conversation_id}`).emit('message_deleted', {
          message_id: data.message_id,
          deleted_by: authenticatedSocket.userId
        });

        // Confirmation to sender
        socket.emit('message_deleted_success', { message_id: data.message_id });

      } catch (error) {
        console.error('❌ Socket: Error deleting message:', error);
        socket.emit('error', {
          message: 'Failed to delete message',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${authenticatedSocket.userData?.full_name} disconnected:`, reason);
      
      // Notify all conversation rooms that user is offline
      socket.broadcast.emit('user_offline', {
        user_id: authenticatedSocket.userId,
        timestamp: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

// Helper function to emit to specific user
export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Helper function to emit to conversation
export const emitToConversation = (io: SocketIOServer, conversationId: string, event: string, data: any) => {
  io.to(`conversation_${conversationId}`).emit(event, data);
};