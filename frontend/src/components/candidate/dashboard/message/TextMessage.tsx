// src/components/candidate/dashboard/message/TextMessage.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { MapPin, Check, CheckCheck } from "lucide-react";
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
  read?: boolean;
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

  const [showActions, setShowActions] = useState(false);

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-4 px-2 sm:px-0`}>
      <div
        className={`px-3 sm:px-4 py-2 rounded-xl text-sm max-w-[85%] sm:max-w-[70%] min-w-[100px] relative isolate ${
          isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Action buttons (reply, delete, copy, react) */}
        {showActions && (
          <div
            className={`absolute top-1 ${
              isMine ? "-left-12 sm:-left-16" : "-right-12 sm:-right-16"
            } transition-opacity duration-200 z-[9999]`}
          >
          <MessageActions
            onReply={onReply}
            onDelete={onDelete}
            onReact={() => setShowReactBar(!showReactBar)}
            onCopy={onCopy}
            isMine={isMine}
          />
          </div>
        )}

        {/* Reaction picker bar */}
        {showReactBar && (
          <div
            className={`fixed ${
              isMine ? "left-4" : "right-4"
            } top-1/2 -translate-y-1/2 bg-white shadow-xl rounded-full px-2 py-1 flex gap-1 z-[10000] border border-gray-200`}
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
            className={`fixed ${
              isMine ? "left-4" : "right-4"
            } top-1/2 -translate-y-1/2 z-[10001] max-w-[90vw] sm:max-w-none`}
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
              <MapPin size={14} className="text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Location</span>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words text-xs sm:text-sm">
            {msg.text}
          </p>
        </div>

        {/* Reaction display */}
        {reaction && (
          <div className={`absolute -bottom-2 ${isMine ? "-left-1 sm:-left-2" : "-right-1 sm:-right-2"} bg-white border border-gray-200 rounded-full px-1 sm:px-1.5 py-0.5 text-xs sm:text-sm shadow-sm`}>
            {reaction}
          </div>
        )}

        {/* Timestamp + read receipt (own messages only) */}
        <div className="flex justify-end items-center gap-1 mt-1 sm:mt-2">
          <span className="text-[10px] sm:text-xs text-gray-500">{msg.timestamp}</span>
          {isMine &&
            (msg.read ? (
              <CheckCheck size={14} className="text-blue-500" aria-label="Read" />
            ) : (
              <Check size={14} className="text-gray-400" aria-label="Sent" />
            ))}
        </div>
      </div>
    </div>
  );
}