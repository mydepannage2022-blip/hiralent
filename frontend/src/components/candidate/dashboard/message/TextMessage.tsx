// src/components/candidate/dashboard/message/TextMessage.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import MessageActions from "./MessageActions";
import EmojiPicker from "emoji-picker-react";

// Use LegacyMessage type
interface LegacyMessage {
  id: string | number;
  sender: "me" | "them";
  text: string;
  type: "text" | "voice" | "image" | "video" | "file" | "location";
  fileName?: string;
  timestamp: string;
  replyTo?: {
    sender: "me" | "them";
    text: string;
    type: "text" | "voice" | "image" | "video" | "file" | "location";
    fileName?: string;
  };
}

interface TextMessageProps {
  msg: LegacyMessage; // Changed from Message to LegacyMessage
  reaction?: string;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

export default function TextMessage({
  msg,
  reaction,
  onReply,
  onDelete,
  onReact,
  onCopy,
}: TextMessageProps) {
  const isMine = msg.sender === "me";
  const isLocation = msg.type === "location";

  const [showReactBar, setShowReactBar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "➕"];

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reply bubble
  const ReplyBubble = () =>
    msg.replyTo ? (
      <div
        className={`mb-1 p-2 rounded-lg ${
          isMine ? "bg-blue-50" : "bg-gray-100"
        } border-l-4 ${isMine ? "border-blue-600" : "border-gray-400"}`}
      >
        <p className="font-medium text-gray-700 text-xs truncate">
          {msg.replyTo.sender === "me" ? "You" : "Them"}
        </p>
        <p className="text-gray-500 text-xs line-clamp-2">
          {msg.replyTo.text ||
            (msg.replyTo.type === "image"
              ? "📷 Photo"
              : msg.replyTo.type === "video"
                ? "🎥 Video"
                : msg.replyTo.type === "file"
                  ? "📎 File"
                  : msg.replyTo.type === "voice"
                    ? "🎤 Voice message"
                    : "Message")}
        </p>
      </div>
    ) : null;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`group px-4 py-2 rounded-xl text-sm max-w-[70%] relative ${
          isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
        }`}
      >
        {/* Action buttons (reply, delete, copy, react) */}
        <div
          className={`absolute top-1 ${
            isMine ? "-left-16" : "-right-16"
          } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
        >
          <MessageActions
            onReply={onReply}
            onDelete={onDelete}
            onReact={() => setShowReactBar(!showReactBar)}
            onCopy={onCopy}
            isMine={isMine}
          />
        </div>

        {/* Reaction picker bar */}
        {showReactBar && (
          <div
            className={`absolute ${
              isMine ? "left-0" : "right-0"
            } -top-12 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-10 border border-gray-200`}
          >
            {emojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (emoji === "➕") {
                    setShowPicker(!showPicker);
                  } else {
                    onReact?.(emoji);
                    setShowReactBar(false);
                  }
                }}
                className="hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {showPicker && (
          <div
            ref={pickerRef}
            className={`absolute ${
              isMine ? "left-0" : "right-0"
            } -top-80 z-20`}
          >
            <EmojiPicker
              onEmojiClick={(emojiObj) => {
                onReact?.(emojiObj.emoji);
                setShowPicker(false);
                setShowReactBar(false);
              }}
            />
          </div>
        )}

        {/* Reply bubble */}
        <ReplyBubble />

        {/* Main content */}
        <div>
          {isLocation && (
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Location</span>
            </div>
          )}
          
          <p className="whitespace-pre-wrap break-words">
            {msg.text}
          </p>
        </div>

        {/* Reaction display */}
        {reaction && (
          <div className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-1 text-sm">
            {reaction}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex justify-end mt-2">
          <span className="text-xs text-gray-500">{msg.timestamp}</span>
        </div>
      </div>
    </div>
  );
}