// -------------------- TYPES --------------------

export type MessageType =
    | "text"
    | "file"
    | "image"
    | "video"
    | "camera"
    | "location"
    | "voice";

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
    isActive?: boolean; // 🟢 controls chat window online dot only
    messages: Message[];
}

// -------------------- MOCK DATA --------------------

export const mockConversations: Conversation[] = [
    {
        id: 1,
        name: "Partners Success",
        avatar: "/images/avatar1.jpg",
        lastSeen: "Online", // Sidebar will show green dot because of this
        starred: false,
        unreadCount: 2,
        isActive: true, // Chat window avatar dot ON
        messages: [
            {
                id: 1,
                sender: "them",
                text: "Hey Ana, thank you for your interest in the ‘Front-end Developer’ position!",
                type: "text",
                timestamp: "12:45",
            },
            {
                id: 2,
                sender: "me",
                text: "Looks great! When can we proceed with the next step?",
                type: "text",
                timestamp: "12:46",
            },
        ],
    },
    {
        id: 2,
        name: "Marketing Team",
        avatar: "/images/avatar2.jpg",
        lastSeen: "Last seen 2 hours ago", // ❌ No green dot in sidebar
        starred: false,
        unreadCount: 0, // Won’t show 0 badge
        isActive: false, // Chat window avatar dot OFF
        messages: [
            {
                id: 1,
                sender: "them",
                text: "Don’t forget tomorrow’s client meeting at 11am.",
                type: "text",
                timestamp: "09:15",
            },
        ],
    },
    {
        id: 3,
        name: "HR - Revolut",
        avatar: "/images/avatar3.jpg",
        lastSeen: "Last seen 10 minutes ago",
        starred: false,
        unreadCount: 5,
        isActive: false,
        messages: [
            {
                id: 1,
                sender: "them",
                text: "Hi Ana, we’d appreciate your feedback on your recent interview.",
                type: "text",
                timestamp: "10:20",
            },
        ],
    },
];