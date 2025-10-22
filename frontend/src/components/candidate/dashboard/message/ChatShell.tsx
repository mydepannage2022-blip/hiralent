"use client";
import React, { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
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
        <div className="w-full max-w-4xl 2xl:max-w-7xl flex h-[100vh] 2xl:h-[calc(100vh-200px)] border rounded-lg overflow-hidden shadow-sm bg-white">
            {/* Sidebar */}
            <div
                className={`w-full md:w-1/3 border-r transition-all duration-300 ${selectedChatId ? "hidden md:flex" : "flex"
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
                className={`flex-1 transition-all duration-300 ${selectedChatId ? "flex" : "hidden md:flex"
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