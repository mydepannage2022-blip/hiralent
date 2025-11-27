// src/components/candidate/dashboard/message/VoiceMessage.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Download,
  Reply,
  Trash2,
  Copy,
  Heart,
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
  replyTo?: {
    sender: "me" | "them";
    text: string;
    type: "text" | "voice" | "image" | "video" | "file" | "location";
    fileName?: string;
  };
}

interface VoiceMessageProps {
  msg: LegacyMessage;
  reaction?: string;
  onReply?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onCopy?: () => void;
}

export default function VoiceMessage({
  msg,
  reaction,
  onReply,
  onDelete,
  onReact,
  onCopy,
}: VoiceMessageProps) {
  const isMine = msg.sender === "me";
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showReactBar, setShowReactBar] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "➕"];

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio(msg.text);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [msg.text]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const downloadAudio = () => {
    const link = document.createElement("a");
    link.href = msg.text;
    link.download = msg.fileName || `voice-message-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reply bubble
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

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`group px-4 py-3 rounded-xl max-w-[70%] relative ${
          isMine
            ? "bg-[#EFF5FF] text-black rounded-br-none"
            : "bg-[#F9F9F9] text-black rounded-bl-none"
        }`}
      >
        {/* Action buttons */}
        <div
          className={`absolute top-1 ${
            isMine ? "-left-16" : "-right-16"
          } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
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

        {/* Reaction picker */}
        {showReactBar && (
          <div
            className={`absolute ${
              isMine ? "left-0" : "right-0"
            } -top-12 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-10 border border-gray-200`}
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
            } -top-80 z-20`}
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

        {/* Voice message content */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            className={`p-2 rounded-full ${
              isMine ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
            } hover:opacity-80 transition-opacity`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Waveform/Progress bar */}
            <div
              className="h-2 bg-gray-300 rounded-full cursor-pointer mb-1"
              onClick={handleSeek}
            >
              <div
                className={`h-full ${
                  isMine ? "bg-blue-600" : "bg-gray-600"
                } rounded-full transition-all duration-100`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            onClick={downloadAudio}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Download audio"
          >
            <Download size={16} />
          </button>
        </div>

        {/* Reaction display */}
        {reaction && (
          <div className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-1 text-sm">
            {reaction}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{msg.timestamp}</span>
        </div>
      </div>
    </div>
  );
}