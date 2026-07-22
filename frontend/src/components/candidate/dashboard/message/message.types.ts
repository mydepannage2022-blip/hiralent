// Local message shape consumed by MessageBubble in this folder.
// Distinct from the canonical backend API type in src/types/message.types.ts —
// this is the simplified view-model used by the candidate chat bubbles.

export type MessageType = "text" | "file";

export interface Message {
  fromMe: boolean;
  type: MessageType;
  text?: string;
  fileName?: string;
  fileSize?: string;
  createdAt: string | number | Date;
}
