"use client";
import React, { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Message } from "./mockData";

export default function VoiceMessage({ msg }: { msg: Message }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    return (
        <div className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[70%]">
                <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl">
                    <button
                        onClick={() => {
                            togglePlay();
                            setPlaying(!playing);
                        }}
                        className="text-blue-600"
                    >
                        {playing ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <div className="flex-1 h-4 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[60%]" />
                    </div>
                    <span className="text-xs text-gray-600">{msg.timestamp}</span>
                </div>
                <audio
                    ref={audioRef}
                    src={msg.text}
                    onEnded={() => setPlaying(false)}
                />
            </div>
        </div>
    );
}