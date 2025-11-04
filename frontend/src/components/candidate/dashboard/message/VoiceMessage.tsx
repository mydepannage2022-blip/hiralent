"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Message } from "./mockData";

export default function VoiceMessage({ msg }: { msg: Message }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const isMine = msg.sender === "me";

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

    // Simple generated waveform (visual only)
    const renderWaveform = (count: number) => {
        const bars = Array.from({ length: count }, (_, i) => {
            const height = Math.random() * 14 + 4; // random height for visual wave
            return (
                <div
                    key={i}
                    className={`w-[2px] mx-[1px] rounded-full ${isMine ? "bg-blue-600" : "bg-gray-500"
                        }`}
                    style={{ height }}
                ></div>
            );
        });
        return bars;
    };

    return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
            <div
                className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"
                    }`}
            >
                <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isMine
                            ? "bg-[#EFF5FF] text-black rounded-br-none"
                            : "bg-[#F9F9F9] text-black rounded-bl-none"
                        }`}
                >
                    {/* Play button */}
                    <button
                        onClick={togglePlay}
                        className={`w-9 h-9 flex items-center justify-center rounded-full ${isMine ? "bg-blue-500" : "bg-gray-400"
                            }`}
                    >
                        {isPlaying ? (
                            <Pause size={18} className="text-white" />
                        ) : (
                            <Play size={18} className="text-white" />
                        )}
                    </button>

                    {/* Waveform */}
                    <div className="flex-1 flex items-center justify-start h-6 overflow-hidden">
                        <div className="flex items-end w-full">{renderWaveform(40)}</div>
                    </div>

                    {/* Duration */}
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                        {formatTime(duration)}
                    </span>
                </div>

                {/* Timestamp */}
                <div className="text-[10px] text-gray-500 text-right mt-1">
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