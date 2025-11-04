"use client";
import React from "react";
import { Message } from "./mockData";

interface MediaMessageProps {
  msg: Message;
  onPreview?: (media: { type: "image" | "video"; src: string }) => void;
}

export default function MediaMessage({ msg, onPreview }: MediaMessageProps) {
  if (!msg || !msg.text) return null;

  const isImage = msg.type === "image" || msg.type === "camera";
  const isVideo = msg.type === "video";
  const isMine = msg.sender === "me";

  const handlePreview = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    onPreview?.({
      type: isVideo ? "video" : "image",
      src: msg.text,
    });
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          onDoubleClick={handlePreview}
          onClick={(e) => {
            const isTouch =
              typeof navigator !== "undefined" &&
              ((navigator as any).maxTouchPoints && (navigator as any).maxTouchPoints > 0);
            if (isTouch) handlePreview(e);
          }}
          className={`relative overflow-hidden rounded-xl cursor-pointer 
          ${isMine ? "bg-[#EFF5FF] rounded-br-none" : "bg-[#F9F9F9] rounded-bl-none"}
          max-w-[250px] max-h-[250px]`}
        >
          {isImage && (
            <img
              src={msg.text}
              alt={msg.fileName ?? "image"}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          )}

          {isVideo && (
            <video
              src={msg.text}
              controls
              className="w-full h-full object-cover"
              playsInline
            />
          )}
        </div>

        {/* Timestamp */}
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