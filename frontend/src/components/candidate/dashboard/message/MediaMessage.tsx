// src/components/candidate/dashboard/message/MediaMessage.tsx
"use client";
import React, { useState, useRef, useEffect , useMemo } from "react";
import { Play, Download, Maximize, Check, CheckCheck } from "lucide-react";
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

interface MediaMessageProps {
  msg: LegacyMessage;
  onPreview?: (media: { type: "image" | "video"; src: string }) => void;
  reaction?: string;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

function MediaMessage({
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
  
  const imageUrl = useMemo(() => msg.text, [msg.text]);
  const [showReactBar, setShowReactBar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "➕"];

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
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-4 px-2 sm:px-0`}>
      <div
        className={`rounded-xl max-w-[85%] sm:max-w-[70%] relative isolate ${
          isMine
            ? "bg-[#EFF5FF] rounded-br-none"
            : "bg-[#F9F9F9] rounded-bl-none"
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {showActions && (
          <div
            className={`absolute top-2 ${
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

        <div className="p-1">
          {msg.replyTo && (
            <div className="px-3 pt-2">
              <ReplyBubble />
            </div>
          )}

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
                loading="lazy"
              />
            )}

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

            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {msg.fileName && (
            <div className="px-3 pb-2 pt-1">
              <p className="text-sm text-gray-700">{msg.fileName}</p>
            </div>
          )}

          <div className="px-3 pb-2 flex justify-end items-center gap-1">
            <span className="text-xs text-gray-500">{msg.timestamp}</span>
            {isMine &&
              (msg.read ? (
                <CheckCheck size={14} className="text-blue-500" aria-label="Read" />
              ) : (
                <Check size={14} className="text-gray-400" aria-label="Sent" />
              ))}
          </div>
        </div>

        {reaction && (
          <div className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-1 text-sm">
            {reaction}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MediaMessage, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.reaction === nextProps.reaction &&
    prevProps.msg.text === nextProps.msg.text &&
    // Read-receipt updates must re-render the bubble so the ✓ can flip to ✓✓.
    prevProps.msg.read === nextProps.msg.read
  );
});
