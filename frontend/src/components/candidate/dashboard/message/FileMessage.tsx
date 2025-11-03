"use client";
import React, { useEffect, useState } from "react";
import { Message } from "./mockData";
import {
  FileText,
  Image as ImageIcon,
  Video,
  FileArchive,
  FileSpreadsheet,
  Paperclip,
} from "lucide-react";

// 🧩 Pick correct icon by file extension
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

// 🧮 Format file size
function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileMessage({ msg }: { msg: Message }) {
  const isMine = msg.sender === "me";
  const Icon = iconForFile(msg.fileName);
  const [fileSize, setFileSize] = useState<string>("");

  // 📦 Fetch actual file size
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

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"
          }`}
      >
        {/* 💬 File Bubble */}
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isMine
              ? "bg-[#EFF5FF] text-black rounded-br-none"
              : "bg-[#F9F9F9] text-black rounded-bl-none"
            }`}
        >
          {/* 📁 File Icon */}
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${isMine ? "bg-[#DCEBFF]" : "bg-gray-200"
              }`}
          >
            <Icon size={20} />
          </div>

          {/* 📜 File Details */}
          <div className="flex flex-col text-sm">
            <p className="font-medium truncate max-w-[180px]">
              {msg.fileName ?? "Untitled file"}
            </p>
            <p className="text-xs text-gray-500">
              {fileSize || "Loading..."}
            </p>
            <a
              href={downloadHref}
              download={msg.fileName}
              className="text-xs text-blue-600 font-semibold mt-1 underline"
            >
              OPEN WITH
            </a>
          </div>
        </div>

        {/* 🕒 Timestamp — aligned just below bubble like voice message */}
        <div
          className={`text-[10px] text-gray-500 mt-1 ${isMine ? "text-right" : "text-left"
            }`}
        >
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}