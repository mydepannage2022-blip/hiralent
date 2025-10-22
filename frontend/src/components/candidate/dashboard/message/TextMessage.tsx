"use client";
import React from "react";
import { Message } from "./mockData";

export default function TextMessage({ msg }: { msg: Message }) {
  const isMine = msg.sender === "me";
  const isLocation = msg.type === "location";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`px-4 py-2 rounded-lg text-sm max-w-[70%] ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
        {isLocation ? (
          <a href={msg.text} target="_blank" rel="noreferrer" className="underline text-blue-200">📍 View Location</a>
        ) : (
          <span>{msg.text}</span>
        )}
        <div className="text-[10px] text-gray-400 mt-1 text-right">{msg.timestamp}</div>
      </div>
    </div>
  );
}