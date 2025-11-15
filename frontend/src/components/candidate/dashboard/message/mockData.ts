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
  // Added: reply reference for WhatsApp-style reply bubble
  replyTo?: {
    sender: "me" | "them";
    text: string;
    type: MessageType;
    fileName?: string;
  };
}

export interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastSeen: string;
  unreadCount?: number;
  isActive?: boolean;
  messages: Message[];
}

// -------------------- MOCK DATA --------------------

export const mockConversations: Conversation[] = [
  {
    id: 1,
    name: "Schlumberger",
    avatar: "/images/companyavatar3.png",
    lastSeen: "Online",
    unreadCount: 2,
    isActive: true,
    messages: [
      {
        id: 1,
        sender: "them",
        text:
          "Hey Ana, thank you for your interest in the ‘Front-end Developer’ position!",
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
      {
        id: 3,
        sender: "them",
        text: "/audio/sample-voice.mp3",
        type: "voice",
        timestamp: "12:47",
      },
    ],
  },
  {
    id: 2,
    name: "Woodplc",
    avatar: "/images/companyavatar2.png",
    lastSeen: "Last seen 2 hours ago",
    unreadCount: 0,
    isActive: false,
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
    name: "Etihad Airways",
    avatar: "/images/companyavatar1.png",
    lastSeen: "Last seen 10 minutes ago",
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