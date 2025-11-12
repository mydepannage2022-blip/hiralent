import { z } from "zod";

// Message Types Enum
export const MessageTypeEnum = z.enum([
  "text",
  "voice", 
  "image",
  "video",
  "file",
  "location"
]);

// Create Conversation Schema
export const CreateConversationSchema = z.object({
  participant_id: z.string().uuid("Invalid participant ID format"),
  initial_message: z.string().min(1, "Initial message is required").optional()
});

// Send Message Schema
export const SendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message too long").optional(),
  message_type: MessageTypeEnum.default("text"),
  reply_to_id: z.string().uuid("Invalid reply message ID").optional(),
  file_url: z.string().url("Invalid file URL").optional(),
  file_name: z.string().min(1, "File name required if file attached").optional(),
  file_size: z.number().int().positive("File size must be positive").optional()
}).superRefine((data, ctx) => {
  // Text messages must have content
  if (data.message_type === "text" && (!data.content || data.content.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Text messages must have content",
      path: ["content"]
    });
  }

  // File messages must have file_url
  if (["voice", "image", "video", "file"].includes(data.message_type) && !data.file_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "File messages must have file_url",
      path: ["file_url"]
    });
  }

  // Location messages should have content (coordinates)
  if (data.message_type === "location" && !data.content) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Location messages must have coordinates in content",
      path: ["content"]
    });
  }
});

// Get Messages Schema (Query params)
export const GetMessagesSchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().min(1, "Page must be at least 1")
  ).default("1"),
  limit: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100")
  ).default("20"),
  before_message_id: z.string().uuid("Invalid message ID").optional()
});

// Mark Read Schema
export const MarkReadSchema = z.object({
  message_ids: z.array(z.string().uuid("Invalid message ID")).min(1, "At least one message ID required").max(50, "Cannot mark more than 50 messages at once")
});

// Archive Conversation Schema
export const ArchiveConversationSchema = z.object({
  is_archived: z.boolean()
});

// URL Params Schemas
export const ConversationParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID")
});

export const MessageParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID")
});

// Search Conversations Schema
export const SearchConversationsSchema = z.object({
  search: z.string().min(1, "Search query required").max(100, "Search query too long").optional(),
  archived: z.string().transform(val => val === "true").pipe(z.boolean()).optional()
});

// File Upload Schema for Messages
export const MessageFileUploadSchema = z.object({
  message_type: MessageTypeEnum,
  reply_to_id: z.string().uuid("Invalid reply message ID").optional()
});

// Message Response Schema (for type safety)
export const MessageResponseSchema = z.object({
  message_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string().nullable(),
  reply_to_id: z.string().uuid().nullable(),
  message_type: MessageTypeEnum,
  file_url: z.string().url().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().int().nullable(),
  is_read: z.boolean(),
  is_deleted: z.boolean(),
  sent_at: z.date(),
  read_at: z.date().nullable(),
  sender: z.object({
    user_id: z.string().uuid(),
    full_name: z.string(),
    profile_picture_url: z.string().url().nullable(),
    role: z.string()
  }).optional(),
  reply_to: z.object({
    message_id: z.string().uuid(),
    content: z.string().nullable(),
    sender_name: z.string(),
    message_type: MessageTypeEnum
  }).nullable().optional()
});

// Conversation Response Schema
export const ConversationResponseSchema = z.object({
  conversation_id: z.string().uuid(),
  participant_1_id: z.string().uuid(),
  participant_2_id: z.string().uuid(), 
  last_message_at: z.date().nullable(),
  last_message_id: z.string().uuid().nullable(),
  unread_count: z.number().int(),
  is_archived: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  other_participant: z.object({
    user_id: z.string().uuid(),
    full_name: z.string(),
    profile_picture_url: z.string().url().nullable(),
    role: z.string(),
    is_online: z.boolean().optional(),
    last_seen: z.date().nullable().optional()
  }),
  last_message: z.object({
    message_id: z.string().uuid(),
    content: z.string().nullable(),
    message_type: z.string().transform(val => val as MessageType),
    sender_id: z.string().uuid(),
    sent_at: z.date(),
    is_read: z.boolean()
  }).nullable()
});

// Type exports for TypeScript
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type GetMessagesQuery = z.infer<typeof GetMessagesSchema>;
export type MarkReadInput = z.infer<typeof MarkReadSchema>;
export type ArchiveConversationInput = z.infer<typeof ArchiveConversationSchema>;
export type MessageFileUploadInput = z.infer<typeof MessageFileUploadSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type MessageType = z.infer<typeof MessageTypeEnum>;