"use client";
import React, { useState } from "react";
import ChatSidebar from "../../../candidate/dashboard/message/ChatSidebar";
import ChatWindow from "../../../candidate/dashboard/message/ChatWindow";
import { mockConversations, Conversation, Message } from "./mockData";

const ChatShell: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

    const selectedChat = conversations.find((c) => c.id === selectedChatId) || null;

    // ✅ Select chat and clear unread badge
    const handleSelectChat = (id: number) => {
        setSelectedChatId(id);
        setConversations((prev) =>
            prev.map((chat) => (chat.id === id ? { ...chat, unreadCount: undefined } : chat))
        );
    };

    const handleBack = () => {
        setSelectedChatId(null);
    };

    // ✅ FIX: handleSendMessage now expects a full Message object, not just text
    const handleSendMessage = (chatId: number, newMessage: Message) => {
        setConversations((prev) =>
            prev.map((chat) =>
                chat.id === chatId
                    ? { ...chat, messages: [...chat.messages, newMessage] }
                    : chat
            )
        );
    };

    return (
        <div className="w-full lg:max-w-5xl 2xl:max-w-3/4 flex h-[100vh] 2xl:h-[calc(100vh-200px)] rounded-xl overflow-hidden bg-white">
            {/* Sidebar */}
            <div
                className={`w-full sm:w-1/3 md:w-xs 2xl:w-xl border-r border-gray-100 transition-all duration-300 ${selectedChatId ? "hidden sm:flex" : "flex"
                    }`}
            >
                <ChatSidebar
                    conversations={conversations}
                    activeId={selectedChatId}
                    onSelectChat={handleSelectChat}
                />
            </div>

            {/* Chat Window */}
            <div
                className={`flex-1 transition-all duration-300 ${selectedChatId ? "flex" : "hidden sm:flex"
                    }`}
            >
                <ChatWindow
                    conversation={selectedChat}
                    onBack={handleBack}
                    onSendMessage={handleSendMessage} // ✅ fixed typing
                />
            </div>
        </div>
    );
};

export default ChatShell;