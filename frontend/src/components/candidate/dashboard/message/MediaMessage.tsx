"use client";
import React from "react";
import { Message } from "./mockData";

export default function MediaMessage({ msg }: { msg: Message }) {
  if (!msg || !msg.text) return null;

  const isImage = msg.type === "image" || msg.type === "camera";
  const isVideo = msg.type === "video";

  return (
    <div
      className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"
        }`}
    >
      <div
        className="max-w-[70%] overflow-hidden break-words"
        style={{ wordBreak: "break-word" }}
      >
        <div className="relative overflow-hidden rounded-xl bg-gray-100 max-w-[250px] max-h-[250px]">
          {isImage && (
            <img
              src={msg.text}
              alt={msg.fileName ?? "image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {isVideo && (
            <video
              src={msg.text}
              controls
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="text-[10px] text-gray-400 text-right mt-1">
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}