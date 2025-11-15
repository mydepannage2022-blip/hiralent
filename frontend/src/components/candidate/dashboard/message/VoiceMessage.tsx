"use client";
import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Message } from "./mockData";
import MessageActions from "./MessageActions";
import EmojiPicker from "emoji-picker-react";

interface VoiceMessageProps {
    msg: Message;
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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const [showReactBar, setShowReactBar] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement | null>(null);
    const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "➕"];

    const isMine = msg.sender === "me";

    // Close picker on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle progress + metadata
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => setProgress(audio.currentTime);
        const setMeta = () => setDuration(audio.duration);

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("loadedmetadata", setMeta);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("loadedmetadata", setMeta);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) audio.pause();
        else audio.play();
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    const renderWaveform = (count: number) =>
        Array.from({ length: count }, (_, i) => {
            const height = Math.random() * 14 + 4;
            return (
                <div
                    key={i}
                    className={`w-[2px] mx-[1px] rounded-full ${isMine ? "bg-blue-600" : "bg-gray-500"
                        }`}
                    style={{ height }}
                ></div>
            );
        });

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

                    {/* Play / Pause Button */}
                    <button
                        onClick={togglePlay}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white"
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    {/* Waveform */}
                    <div className="flex items-center justify-center h-8 w-[100px]">
                        {renderWaveform(24)}
                    </div>

                    {/* Remaining Time */}
                    <div className="text-xs text-gray-600 w-[40px] text-right">
                        {formatTime(duration - progress)}
                    </div>

                    <audio
                        ref={audioRef}
                        src={msg.text}
                        onEnded={() => setIsPlaying(false)}
                        preload="metadata"
                    />
                </div>

                {/* Reaction under bubble */}
                {reaction && <div className="text-lg mt-1">{reaction}</div>}

                {/* Timestamp */}
                <div className="text-[10px] text-gray-500 mt-1 text-right">
                    {msg.timestamp}
                </div>
            </div>
        </div>
    );
}