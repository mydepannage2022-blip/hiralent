"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";

// Universal types that work with both legacy and backend formats
export type MessageType = "text" | "voice" | "image" | "video" | "file" | "location";

export interface LegacyMessage {
    id: string | number;
    sender: "me" | "them";
    text: string;
    type: MessageType;
    fileName?: string;
    timestamp: string;
    replyTo?: {
        sender: "me" | "them";
        text: string;
        type: MessageType;
        fileName?: string;
    };
}

export interface LegacyConversation {
    id: string | number;
    name: string;
    avatar: string;
    lastSeen: string;
    unreadCount?: number;
    isActive?: boolean;
    messages: LegacyMessage[];
}

export interface BackendConversation {
    conversation_id: string;
    other_participant: {
        user_id: string;
        full_name: string;
        profile_picture_url?: string | null;
        role: string;
        is_online?: boolean;
    };
    unread_count: number;
    last_message_at: string | null;
    last_message?: {
        content: string | null;
        message_type: MessageType;
        sent_at: string;
    } | null;
}

type UniversalConversation = LegacyConversation | BackendConversation;

interface ChatSidebarProps {
    conversations: UniversalConversation[];
    activeId: string | number | null;
    onSelectChat: (id: string | number) => void;
    isLoading?: boolean;
    showArchived?: boolean;
}

// Helper functions
const isLegacyConversation = (conv: UniversalConversation): conv is LegacyConversation => {
    return 'messages' in conv && Array.isArray(conv.messages);
};

const getConversationId = (conv: UniversalConversation): string | number => {
    return isLegacyConversation(conv) ? conv.id : conv.conversation_id;
};

const getConversationName = (conv: UniversalConversation): string => {
    return isLegacyConversation(conv) ? conv.name : conv.other_participant.full_name;
};

const getConversationAvatar = (conv: UniversalConversation): string => {
    if (isLegacyConversation(conv)) {
        return conv.avatar;
    }
    return conv.other_participant.profile_picture_url || '/images/candidate.jpg';
};

const getLastSeen = (conv: UniversalConversation): string => {
    if (isLegacyConversation(conv)) {
        return conv.lastSeen;
    }
    return conv.other_participant.is_online ? "Online" : "Offline";
};

const getUnreadCount = (conv: UniversalConversation): number | undefined => {
    if (isLegacyConversation(conv)) {
        return conv.unreadCount;
    }
    return conv.unread_count > 0 ? conv.unread_count : undefined;
};

const getLastMessage = (conv: UniversalConversation): { text: string; time: string } => {
    if (isLegacyConversation(conv)) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        return {
            text: lastMsg?.text || "",
            time: lastMsg?.timestamp || ""
        };
    } else {
        return {
            text: conv.last_message?.content || "",
            time: conv.last_message ? new Date(conv.last_message.sent_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            }) : ""
        };
    }
};

const isOnline = (conv: UniversalConversation): boolean => {
    if (isLegacyConversation(conv)) {
        return conv.lastSeen === "Online" || conv.isActive === true;
    }
    return conv.other_participant.is_online === true;
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    conversations,
    activeId,
    onSelectChat,
    isLoading = false,
    showArchived = false
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        
        const query = searchQuery.toLowerCase();
        return conversations.filter(conv => {
            const name = getConversationName(conv).toLowerCase();
            const lastMessage = getLastMessage(conv).text.toLowerCase();
            return name.includes(query) || lastMessage.includes(query);
        });
    }, [conversations, searchQuery]);

    // Time ago helper function
    const timeAgo = (timestamp: string): string => {
        if (!timestamp) return "";
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now.getTime() - time.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "now";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return "1d";
        if (diffDays < 7) return `${diffDays}d`;
        
        return time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Highlight text helper
    const highlightText = (text: string) => {
        if (!searchQuery.trim()) return text;
        
        const regex = new RegExp(`(${searchQuery})`, "gi");
        const parts = text.split(regex);
        
        return parts.map((part, index) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={index} className="bg-yellow-200 text-black">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const handleSelectChat = (conv: UniversalConversation) => {
        const id = getConversationId(conv);
        onSelectChat(id);
    };

    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-sm">Loading conversations...</p>
                </div>
            );
        }

        if (searchQuery.trim()) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm text-center">
                        No conversations found for "{searchQuery}"
                    </p>
                    <button
                        onClick={() => setSearchQuery("")}
                        className="text-blue-600 text-sm mt-2 hover:underline"
                    >
                        Clear search
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <div className="w-12 h-12 mb-4 opacity-50">💬</div>
                <p className="text-sm text-center">
                    {showArchived ? "No archived conversations" : "No conversations yet"}
                </p>
                <p className="text-xs text-center mt-2 opacity-75">
                    {showArchived ? "Your archived chats will appear here" : "Start a new conversation to get started"}
                </p>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    {showArchived ? "Archived" : "Messages"}
                </h2>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => {
                        const convId = getConversationId(conv);
                        const lastMsg = getLastMessage(conv);
                        const lastText = lastMsg.text || "";
                        const time = lastMsg.time || "";
                        const hasUnread = getUnreadCount(conv);
                        const conversationName = getConversationName(conv);
                        const avatar = getConversationAvatar(conv);
                        const online = isOnline(conv);

                        return (
                            <div
                                key={convId}
                                onClick={() => handleSelectChat(conv)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-100 ${
                                    convId === activeId
                                        ? "bg-[#EFF5FF]"
                                        : "hover:bg-gray-50 active:bg-gray-100"
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={avatar}
                                        alt={conversationName}
                                        className="w-12 h-12 rounded-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = '/images/candidate.jpg';
                                        }}
                                    />
                                    {online && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-medium text-sm md:text-base text-gray-800 truncate">
                                            {highlightText(conversationName)}
                                        </p>
                                        <span className="text-[11px] text-[#757575] whitespace-nowrap">
                                            {timeAgo(time)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs md:text-sm text-[#515151] truncate max-w-[200px]">
                                            {highlightText(lastText) || "No messages yet"}
                                        </p>
                                        {hasUnread && (
                                            <div className="ml-2 min-w-[18px] h-[18px] flex items-center justify-center bg-[#DC0000] text-white text-[10px] font-semibold rounded-full px-1">
                                                {hasUnread > 99 ? '99+' : hasUnread}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    renderEmptyState()
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;