"use client";
import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface VoiceMessageProps {
  audioUrl: string;
  isSender?: boolean; // true = right side bubble (green), false = left (white)
  avatarUrl?: string;
  time?: string;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  isSender = true,
  avatarUrl,
  time = "4:30 PM",
}) => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  // Format seconds mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  useEffect(() => {
    if (!waveformRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(255,255,255,0.6)",
      progressColor: "#fff",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1.5,
      height: 40,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("ready", () => {
      const dur = wavesurfer.current?.getDuration() || 0;
      setDuration(formatTime(dur));
    });

    wavesurfer.current.on("audioprocess", () => {
      const cur = wavesurfer.current?.getCurrentTime() || 0;
      setElapsed(formatTime(cur));
    });

    wavesurfer.current.on("finish", () => {
      setIsPlaying(false);
      setElapsed("0:00");
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!wavesurfer.current) return;
    setIsPlaying(!isPlaying);
    wavesurfer.current.playPause();
  };

  return (
    <div
      className={`flex items-center gap-2 max-w-md p-2 rounded-2xl relative ${
        isSender ? "bg-[#128C7E] text-white ml-auto" : "bg-white text-black mr-auto"
      }`}
    >
      {/* Avatar */}
      {!isSender && avatarUrl && (
        <img
          src={avatarUrl}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover"
        />
      )}

      {/* Play Button */}
      <button
        onClick={togglePlay}
        className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-[#128C7E]"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Waveform */}
      <div className="flex-1">
        <div ref={waveformRef} className="w-full" />
        <div className="flex justify-between text-xs opacity-80 mt-1">
          <span>{elapsed || "0:00"}</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
