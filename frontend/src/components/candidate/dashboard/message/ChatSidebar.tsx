"use client";
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Conversation } from "./mockData";

interface ChatSidebarProps {
    conversations: Conversation[];
    activeId: number | null;
    onSelectChat: (id: number) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    conversations,
    activeId,
    onSelectChat,
}) => {
    const [search, setSearch] = useState("");
    const [localChats, setLocalChats] = useState<Conversation[]>(conversations);

    useEffect(() => {
        setLocalChats(conversations);
    }, [conversations]);

    const query = search.trim().toLowerCase();

    // ✅ Reset unread count on click
    const handleSelectChat = (id: number) => {
        setLocalChats((prev) =>
            prev.map((chat) =>
                chat.id === id ? { ...chat, unreadCount: 0 } : chat
            )
        );
        onSelectChat(id);
    };

    const filteredChats = localChats.filter((c) => {
        const lastText = c.messages[c.messages.length - 1]?.text || "";
        return (
            c.name.toLowerCase().includes(query) ||
            lastText.toLowerCase().includes(query)
        );
    });

    const clearSearch = () => setSearch("");

    const highlightText = (text: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, "gi"));
        return parts.map((part, i) =>
            part.toLowerCase() === query ? (
                <span key={i} className="bg-blue-200 font-medium">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    // ✅ Helper to convert timestamps like “7 minutes ago”
    const timeAgo = (timestamp: string) => {
        const now = new Date();
        const msgTime = new Date();
        const [hour, minute] = timestamp.split(":").map(Number);
        msgTime.setHours(hour);
        msgTime.setMinutes(minute);

        const diffMs = now.getTime() - msgTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        return msgTime.toLocaleDateString();
    };

    // 🟦 Empty State UI
    const renderEmptyState = () => {
        if (conversations.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#A5A5A5]">
                    <p className="text-sm mb-3">No chats here yet</p>
                    <button
                        className="px-6 py-1 text-sm text-[#005DDC] rounded-md border border-[#005DDC] transition"
                        onClick={() => alert("Redirect to job search")}
                    >
                        Search a Job
                    </button>
                </div>
            );
        }

        if (filteredChats.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No chat found
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            {/* 🔍 Search Bar */}
            <div className="py-3 px-2 bg-white">
                <div className="flex items-center border border-black rounded-full px-3 py-2">
                    <Search className="w-4 h-4 text-[#757575] mr-2" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none"
                    />
                    {search && (
                        <button
                            onClick={clearSearch}
                            className="text-[#757575] hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* 💬 Chats List */}
            <div className="flex-1 overflow-y-auto bg-white">
                {filteredChats.length > 0 ? (
                    filteredChats.map((chat) => {
                        const lastMsg = chat.messages[chat.messages.length - 1];
                        const lastText = lastMsg?.text || "";
                        const time = lastMsg?.timestamp || "";
                        const hasUnread =
                            typeof chat.unreadCount === "number" && chat.unreadCount > 0;

                        return (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-100 ${chat.id === activeId
                                    ? "bg-[#EFF5FF]"
                                    : "hover:bg-gray-50 active:bg-gray-100"
                                    }`}
                            >
                                {/* 🧑 Avatar */}
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={chat.avatar}
                                        alt={chat.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    {chat.lastSeen === "Online" && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-sm md:text-base text-gray-800 truncate">
                                            {highlightText(chat.name) as any}
                                        </p>
                                        <span className="text-[11px] text-[#757575] whitespace-nowrap">
                                            {timeAgo(time)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs md:text-sm text-[#515151] truncate">
                                            {highlightText(lastText) as any}
                                        </p>
                                        {hasUnread && (
                                            <div className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#DC0000] text-white text-[10px] font-semibold rounded-full">
                                                {chat.unreadCount}
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