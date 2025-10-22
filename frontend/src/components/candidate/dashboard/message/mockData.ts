export type MessageType = "text" | "file" | "image" | "video" | "camera" | "location" | "voice";

export interface Message {
    id: number;
    sender: "me" | "them";
    text: string;
    type: MessageType;
    fileName?: string;
    timestamp: string;
}

export interface Conversation {
    id: number;
    name: string;
    avatar: string;
    lastSeen: string;
    starred?: boolean;
    unreadCount?: number;
    messages: Message[];
}

export const mockConversations: Conversation[] = [
    {
        id: 1,
        name: "Partners Success",
        avatar: "/images/avatar1.jpg",
        lastSeen: "Online",
        starred: false,
        unreadCount: 2,
        messages: [
            { id: 1, sender: "them", text: "Hey, check this out!", type: "text", timestamp: "12:45" },
        ],
    },
];