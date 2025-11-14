"use client";
import React, { useState, useRef, useEffect } from "react";
import { Message } from "./mockData";
import { MapPin } from "lucide-react";
import MessageActions from "./MessageActions";
import EmojiPicker from "emoji-picker-react";

interface TextMessageProps {
  msg: Message;
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
        className={`mb-1 p-2 rounded-lg ${isMine ? "bg-blue-50" : "bg-gray-100"
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
        className={`group px-4 py-2 rounded-xl text-sm max-w-[70%] relative ${isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
          }`}
      >
        {/* Action buttons (reply, delete, copy, react) */}
        <div
          className={`absolute top-1 ${isMine ? "left-1" : "right-1"
            } opacity-0 group-hover:opacity-100 transition`}
        >
          <MessageActions
            onReply={onReply}
            onDelete={onDelete}
            onCopy={onCopy}
            onOpenReactBar={() => {
              setShowReactBar((s) => !s);
              setShowPicker(false);
            }}
          />
        </div>

        {/* Reaction bar (above the message) */}
        {showReactBar && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-full px-2 py-1 z-40 flex items-center gap-2">
            {emojis.map((e) =>
              e === "➕" ? (
                <div key="plus" className="relative">
                  <button
                    className="text-lg px-2 rounded-full hover:bg-gray-100"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setShowPicker((p) => !p);
                    }}
                  >
                    ➕
                  </button>

                  {showPicker && (
                    <div
                      ref={pickerRef}
                      className={`absolute top-8 z-50 shadow-xl rounded-md ${isMine
                          ? "right-0 translate-x-[10%]" // your messages → anchored to right
                          : "left-0 -translate-x-[10%]" // others → anchored to left
                        }`}
                      style={{ maxWidth: "min(90vw, 320px)" }}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          onReact?.(emojiData.emoji);
                          setShowPicker(false);
                          setShowReactBar(false);
                        }}
                        height={320}
                        width={280}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={e}
                  className="text-lg px-1 rounded-full hover:bg-gray-100"
                  onClick={() => {
                    onReact?.(e);
                    setShowReactBar(false);
                    setShowPicker(false);
                  }}
                >
                  {e}
                </button>
              )
            )}
          </div>
        )}

        {/* Reply bubble */}
        <ReplyBubble />

        {/* Message text or location */}
        {isLocation ? (
          <a
            href={msg.text}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-500 flex items-center"
          >
            <MapPin size={16} className="mr-1" /> Open Map
          </a>
        ) : (
          <span>{msg.text}</span>
        )}

        {/* Reaction display */}
        {reaction && (
          <div className="absolute -bottom-3 right-2 text-lg">{reaction}</div>
        )}

        {/* Timestamp */}
        <div className="text-[10px] mt-1 text-right text-gray-500">
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}