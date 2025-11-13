"use client";
import React, { useEffect, useState, useRef } from "react";
import { Message } from "./mockData";
import {
  FileText,
  Image as ImageIcon,
  Video,
  FileArchive,
  FileSpreadsheet,
  Paperclip,
} from "lucide-react";
import MessageActions from "./MessageActions";
import EmojiPicker from "emoji-picker-react";

interface FileMessageProps {
  msg: Message;
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
        className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"
          }`}
      >
        <div
          className={`group flex items-center gap-3 px-3 py-2 rounded-xl relative ${isMine
              ? "bg-[#EFF5FF] text-black rounded-br-none"
              : "bg-[#F9F9F9] text-black rounded-bl-none"
            }`}
        >
          {/* Actions */}
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

          {/* Reaction Bar */}
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
                            ? "right-0 translate-x-[10%]"
                            : "left-0 -translate-x-[10%]"
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

          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${isMine ? "bg-[#DCEBFF]" : "bg-gray-200"
              }`}
          >
            <Icon size={20} />
          </div>

          <div className="flex flex-col text-sm">
            <ReplyBubble />
            <p className="font-medium truncate max-w-[180px]">
              {msg.fileName ?? "Untitled file"}
            </p>
            <p className="text-xs text-gray-500">{fileSize || "Loading..."}</p>
            <a
              href={downloadHref}
              download={msg.fileName}
              className="text-xs text-blue-600 font-semibold mt-1 underline"
            >
              OPEN WITH
            </a>
          </div>
        </div>

        {reaction && <div className="text-lg mt-1">{reaction}</div>}
        <div className="text-[10px] text-gray-500 mt-1 text-right">
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}