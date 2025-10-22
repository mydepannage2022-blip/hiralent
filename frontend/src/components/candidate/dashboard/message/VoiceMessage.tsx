"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Message } from "./mockData";

export default function VoiceMessage({ msg }: { msg: Message }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

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
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60)
            .toString()
            .padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    return (
        <div
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"
                }`}
        >
            <div
                className={`max-w-[70%] flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"
                    }`}
            >
                <div
                    className={`flex items-center gap-3 p-3 rounded-2xl shadow-sm 
          ${msg.sender === "me"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                >
                    <button
                        onClick={togglePlay}
                        className={`w-9 h-9 flex items-center justify-center rounded-full ${msg.sender === "me"
                                ? "bg-blue-500 hover:bg-blue-700"
                                : "bg-white hover:bg-gray-200"
                            }`}
                    >
                        {isPlaying ? (
                            <Pause size={18} className="text-gray-800" />
                        ) : (
                            <Play size={18} className="text-gray-800" />
                        )}
                    </button>

                    {/* Progress bar */}
                    <div className="flex-1">
                        <div className="relative w-40 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                            <div
                                className={`absolute left-0 top-0 h-full ${msg.sender === "me" ? "bg-white" : "bg-blue-600"
                                    }`}
                                style={{
                                    width: duration ? `${(progress / duration) * 100}%` : "0%",
                                }}
                            ></div>
                        </div>
                        <div className="text-[11px] mt-1 opacity-80">
                            {formatTime(progress)} / {formatTime(duration)}
                        </div>
                    </div>
                </div>

                <div className="text-[10px] text-gray-400 text-right mt-1">
                    {msg.timestamp}
                </div>

                <audio
                    ref={audioRef}
                    src={msg.text}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>
        </div>
    );
}