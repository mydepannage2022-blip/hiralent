"use client";
import React, { useState, useRef, useEffect } from "react";
import { Message } from "./mockData";
import MessageActions from "./MessageActions";
import EmojiPicker from "emoji-picker-react";

interface MediaMessageProps {
  msg: Message;
  reaction?: string;
  onPreview?: (media: { type: "image" | "video"; src: string }) => void;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

export default function MediaMessage({
  msg,
  reaction,
  onPreview,
  onReply,
  onDelete,
  onReact,
  onCopy,
}: MediaMessageProps) {
  if (!msg || !msg.text) return null;

  const isImage = msg.type === "image" || msg.type === "camera";
  const isVideo = msg.type === "video";
  const isMine = msg.sender === "me";

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

  const handlePreview = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    onPreview?.({
      type: isVideo ? "video" : "image",
      src: msg.text,
    });
  };

  return ( 
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"
          }`}
      >
        <div
          onDoubleClick={handlePreview}
          onClick={(e) => {
            const isTouch =
              typeof navigator !== "undefined" &&
              (navigator as any).maxTouchPoints > 0;
            if (isTouch) handlePreview(e);
          }}
          className={`group relative overflow-hidden rounded-xl cursor-pointer 
          ${isMine ? "bg-[#EFF5FF] rounded-br-none" : "bg-[#F9F9F9] rounded-bl-none"}
          max-w-[250px] max-h-[250px]`}
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

          {/* Media */}
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

        {reaction && <div className="text-lg mt-1">{reaction}</div>}
        <div className="text-[10px] text-gray-500 mt-1 text-right">
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}