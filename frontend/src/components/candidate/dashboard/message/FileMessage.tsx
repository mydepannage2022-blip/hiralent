"use client";
import React from "react";
import { Message } from "./mockData";

function iconForFile(fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (!ext) return "📎";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "🖼️";
  if (["mp4", "mov"].includes(ext)) return "🎬";
  if (ext === "pdf") return "📄";
  if (["zip", "rar"].includes(ext)) return "🗜️";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["doc", "docx"].includes(ext)) return "📃";
  return "📎";
}

export default function FileMessage({ msg }: { msg: Message }) {
  const isMine = msg.sender === "me";
  const downloadHref = msg.text || "#"; // text holds object URL for files (see ChatWindow)
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`px-3 py-2 rounded-lg max-w-[70%] ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
        <a href={downloadHref} download={msg.fileName} className="flex items-center gap-2 underline text-sm">
          <span>{iconForFile(msg.fileName)}</span>
          <span className="truncate max-w-[200px]">{msg.fileName ?? msg.text}</span>
        </a>
        <div className="text-[10px] text-gray-300 mt-1 text-right">{msg.timestamp}</div>
      </div>
    </div>
  );
}