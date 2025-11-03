"use client";
import React from "react";
import { Message } from "./mockData";
import { MapPin } from "lucide-react";

export default function TextMessage({ msg }: { msg: Message }) {
  const isMine = msg.sender === "me";
  const isLocation = msg.type === "location";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`px-4 py-2 rounded-xl text-sm max-w-[70%] relative
          ${isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
          }`}
      >
        {isLocation ? (
          <a
            href={msg.text}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-500 flex items-center"
          >
            <MapPin size={16} className="mr-1"/> Open Map
          </a>
        ) : (
          <span>{msg.text}</span>
        )}

        <div
          className={`text-[10px] mt-1 text-right text-gray-500`}
        >
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}