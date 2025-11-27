// src/components/candidate/dashboard/message/MediaMessage.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Play, Download, Maximize } from "lucide-react";
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

interface MediaMessageProps {
  msg: LegacyMessage; // Changed from Message to LegacyMessage
  onPreview?: (media: { type: "image" | "video"; src: string }) => void;
  reaction?: string;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

export default function MediaMessage({
  msg,
  onPreview,
  reaction,
  onReply,
  onDelete,
  onReact,
  onCopy,
}: MediaMessageProps) {
  const isMine = msg.sender === "me";
  const isVideo = msg.type === "video";
  
  const [showReactBar, setShowReactBar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
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

  const handlePreview = () => {
    if (onPreview) {
      onPreview({
        type: isVideo ? "video" : "image",
        src: msg.text,
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = msg.text;
    link.download = msg.fileName || `media-${Date.now()}${isVideo ? ".mp4" : ".jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        className={`group rounded-xl max-w-[70%] relative ${
          isMine
            ? "bg-[#EFF5FF] rounded-br-none"
            : "bg-[#F9F9F9] rounded-bl-none"
        }`}
      >
        {/* Action buttons */}
        <div
          className={`absolute top-2 ${
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

        {/* Reaction picker */}
        {showReactBar && (
          <div
            className={`absolute ${
              isMine ? "left-2" : "right-2"
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
              isMine ? "left-2" : "right-2"
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

        <div className="p-1">
          {/* Reply bubble */}
          {msg.replyTo && (
            <div className="px-3 pt-2">
              <ReplyBubble />
            </div>
          )}

          {/* Media content */}
          <div className="relative">
            {isVideo ? (
              <video
                src={msg.text}
                className="w-full max-w-sm h-auto rounded-lg cursor-pointer"
                controls={false}
                preload="metadata"
                onLoadedData={() => setIsLoaded(true)}
                onClick={handlePreview}
              />
            ) : (
              <img
                src={msg.text}
                alt="Shared media"
                className="w-full max-w-sm h-auto rounded-lg cursor-pointer object-cover"
                onLoad={() => setIsLoaded(true)}
                onClick={handlePreview}
                style={{ maxHeight: "300px" }}
              />
            )}

            {/* Video play overlay */}
            {isVideo && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg cursor-pointer"
                onClick={handlePreview}
              >
                <div className="bg-white bg-opacity-90 rounded-full p-2">
                  <Play size={24} className="text-gray-700" />
                </div>
              </div>
            )}

            {/* Media controls */}
            {isLoaded && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={handlePreview}
                  className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                  title="View full size"
                >
                  <Maximize size={16} />
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                  title="Download"
                >
                  <Download size={16} />
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Caption if exists */}
          {msg.fileName && (
            <div className="px-3 pb-2 pt-1">
              <p className="text-sm text-gray-700">{msg.fileName}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="px-3 pb-2 flex justify-end">
            <span className="text-xs text-gray-500">{msg.timestamp}</span>
          </div>
        </div>

        {/* Reaction display */}
        {reaction && (
          <div className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-1 text-sm">
            {reaction}
          </div>
        )}
      </div>
    </div>
  );
}