"use client";
import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
    conversationId: number;
    onSend: (text: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (!message.trim()) return;
        onSend(message);
        setMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSend();
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button
                onClick={handleSend}
                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
            >
                <Send size={18} />
            </button>
        </div>
    );
};

export default ChatInput;