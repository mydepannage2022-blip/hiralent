// validation/chatbot.schema.ts
import { z } from "zod";

export const sendMessageSchema = z.object({
  conversation_id: z
    .string()
    .uuid("Invalid conversation id"),

  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long (max 1000 characters)")
    .trim(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
