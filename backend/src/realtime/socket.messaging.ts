import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import * as messageService from '../services/message.service';
import { MessageType } from '../validation/message.schema';

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
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.user_id;
      socket.userData = {
        user_id: decoded.user_id,
        full_name: decoded.full_name,
        role: decoded.role
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
    socket.on('mark_messages_read', async (data: { message_ids: string[] }) => {
      try {
        if (!authenticatedSocket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const result = await messageService.markMessagesAsRead(authenticatedSocket.userId, {
          message_ids: data.message_ids
        });

        // Notify sender(s) that their messages were read
        for (const messageId of data.message_ids) {
          socket.broadcast.emit('message_read', {
            message_id: messageId,
            read_by: authenticatedSocket.userId,
            read_at: new Date()
          });
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