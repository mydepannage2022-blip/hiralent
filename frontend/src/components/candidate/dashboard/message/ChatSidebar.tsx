"use client";
import React, { useState } from "react";
import { Search, X, Star } from "lucide-react";
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
    const query = search.trim().toLowerCase();

    const filteredChats = conversations.filter((c) => {
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
                <span key={i} className="bg-yellow-200 font-medium">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div className="flex flex-col w-full bg-white h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b relative">
                <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
                    <Search className="w-4 h-4 text-gray-500 mr-2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none"
                    />
                    {search && (
                        <button
                            onClick={clearSearch}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => {
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    const lastText = lastMsg?.text || "";
                    const time = lastMsg?.timestamp || "";

                    return (
                        <div
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b hover:bg-gray-50 transition ${chat.id === activeId ? "bg-blue-50" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <div className="relative">
                                <img
                                    src={chat.avatar}
                                    alt={chat.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                                {chat.lastSeen === "Online" && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-sm text-gray-800 truncate">
                                        {highlightText(chat.name) as any}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        {chat.starred && (
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        )}
                                        <span className="text-[11px] text-gray-400">{time}</span>
                                        {chat.unreadCount && (
                                            <div className="ml-1 min-w-[20px] h-[20px] flex items-center justify-center bg-blue-600 text-white text-xs font-semibold rounded-full">
                                                {chat.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 truncate">
                                    {highlightText(lastText) as any}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChatSidebar;