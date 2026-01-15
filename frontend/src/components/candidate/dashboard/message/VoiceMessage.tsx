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
  const [showActions, setShowActions] = useState(false);
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

  // Initialize audio with better quality settings
  useEffect(() => {
    const audio = new Audio();

    // Set audio source
    audio.src = msg.text;
    audio.preload = "metadata";

    // Enable better audio quality
    audio.volume = 1.0;
    audio.preservesPitch = true;

    audioRef.current = audio;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        console.log('🎵 Audio duration loaded:', audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      console.log('🎵 Playback ended');
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      console.error('Audio loading error:', {
        error: target.error,
        src: msg.text,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      setIsPlaying(false);
      setDuration(0);
    };

    const handleCanPlay = () => {
      console.log('🎵 Audio can play, duration:', audio.duration);
      updateDuration();
    };

    const handleLoadedData = () => {
      console.log('🎵 Audio data loaded');
      updateDuration();
    };

    // Add event listeners
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("canplaythrough", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Try to load metadata
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("canplaythrough", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Properly cleanup
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load(); // Reset the audio element
    };
  }, [msg.text]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not initialized');
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        console.log('🎵 Paused');
      } else {
        // Check if audio is ready to play
        if (audio.readyState < 2) {
          console.log('🎵 Audio not ready, loading...');
          audio.load();
          await new Promise((resolve) => {
            audio.addEventListener('canplay', resolve, { once: true });
          });
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          console.log('🎵 Playing');
        }
      }
    } catch (error: any) {
      console.error('Playback error:', error);
      setIsPlaying(false);

      // Show user-friendly error message
      if (error.name === 'NotAllowedError') {
        console.error('Playback not allowed by browser');
      } else if (error.name === 'NotSupportedError') {
        console.error('Audio format not supported');
      }
    }
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
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-4 px-2 sm:px-0`}>
      <div
        className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl max-w-[85%] sm:max-w-[70%] relative isolate ${
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

        {/* Voice message content */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            disabled={!duration && duration !== 0}
            className={`p-2 rounded-full ${
              isMine ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
            } hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Waveform/Progress bar */}
            <div
              className="h-2 bg-gray-300 rounded-full cursor-pointer mb-1 relative overflow-hidden"
              onClick={handleSeek}
              title="Seek"
            >
              <div
                className={`h-full ${
                  isMine ? "bg-blue-600" : "bg-gray-600"
                } rounded-full transition-all duration-100 ease-linear`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
              {/* Loading indicator */}
              {!duration && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{duration ? formatTime(duration) : "--:--"}</span>
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