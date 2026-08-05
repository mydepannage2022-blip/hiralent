// src/components/candidate/dashboard/message/FileMessage.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  FileArchive,
  FileSpreadsheet,
  Paperclip,
  Reply,
  Trash2,
  Copy,
  Heart,
  Check,
  CheckCheck,
} from "lucide-react";
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

interface FileMessageProps {
  msg: LegacyMessage;
  reaction?: string;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

function iconForFile(fileName?: string): React.ComponentType<{ size?: number }> {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (!ext) return Paperclip;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ImageIcon;
  if (["mp4", "mov", "mkv"].includes(ext)) return Video;
  if (ext === "pdf") return FileText;
  if (["zip", "rar"].includes(ext)) return FileArchive;
  if (["xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["doc", "docx"].includes(ext)) return FileText;
  return Paperclip;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileMessage({
  msg,
  reaction,
  onReply,
  onDelete,
  onReact,
  onCopy,
}: FileMessageProps) {
  const isMine = msg.sender === "me";
  const Icon = iconForFile(msg.fileName);
  const [fileSize, setFileSize] = useState<string>("");
  const [showReactBar, setShowReactBar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
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

  useEffect(() => {
    const fetchSize = async () => {
      try {
        if (!msg.text) return;
        const response = await fetch(msg.text);
        const blob = await response.blob();
        setFileSize(formatFileSize(blob.size));
      } catch {
        setFileSize("Unknown size");
      }
    };
    fetchSize();
  }, [msg.text]);

  const downloadHref = msg.text || "#";

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
        className={`px-3 sm:px-4 py-2 rounded-xl text-sm max-w-[85%] sm:max-w-[70%] relative isolate ${
          isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Action buttons */}
        {showActions && (
          <div
            className={`absolute top-1 ${
              isMine ? "-left-12 sm:-left-16" : "-right-12 sm:-right-16"
            } transition-opacity duration-200 z-[9999]`}
          >
          <div className="flex gap-1">
            {onReply && (
              <button
                onClick={onReply}
                className="p-1 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-all"
                title="Reply"
              >
                <Reply size={12} />
              </button>
            )}
            
            <button
              onClick={() => setShowReactBar(!showReactBar)}
              className="p-1 rounded-full text-gray-600 hover:text-red-500 hover:bg-gray-100 transition-all"
              title="React"
            >
              <Heart size={12} />
            </button>

            {onCopy && (
              <button
                onClick={onCopy}
                className="p-1 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all"
                title="Copy"
              >
                <Copy size={12} />
              </button>
            )}

            {isMine && onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded-full text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          </div>
        )}

        {/* Reaction picker */}
        {showReactBar && (
          <div
            className={`absolute ${
              isMine ? "left-0" : "right-0"
            } -top-12 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-[10000] border border-gray-200`}
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
            } -top-80 z-[10001]`}
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

        {/* File content */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMine ? "bg-blue-100" : "bg-gray-200"}`}>
            {/* Fixed: Removed className prop from Icon */}
            <div className={isMine ? "text-blue-600" : "text-gray-600"}>
              <Icon size={24} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">
              {msg.fileName || "Unknown file"}
            </p>
            <p className="text-xs text-gray-500">{fileSize}</p>
          </div>

          <a
            href={downloadHref}
            download={msg.fileName}
            className={`px-3 py-1 rounded text-xs font-medium ${
              isMine
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-600 text-white hover:bg-gray-700"
            } transition-colors`}
          >
            Download
          </a>
        </div>

        {/* Reaction display */}
        {reaction && (
          <div className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-1 text-sm">
            {reaction}
          </div>
        )}

        {/* Timestamp + read receipt (own messages only) */}
        <div className="flex justify-end items-center gap-1 mt-2">
          <span className="text-xs text-gray-500">{msg.timestamp}</span>
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