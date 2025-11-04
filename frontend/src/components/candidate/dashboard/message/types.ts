export type MessageType = "text" | "file" | "voice";

export interface Message {
    id: string;
    fromMe: boolean;
    type: MessageType;
    text?: string;
    fileName?: string;
    fileSize?: string;
    audioUrl?: string;
    createdAt: string;
}

export interface Conversation {
    id: string;
    title: string;
    avatar?: string;
    lastSeen?: string;
    unread?: number;
    lastMessage?: string;
    messages: Message[];
}