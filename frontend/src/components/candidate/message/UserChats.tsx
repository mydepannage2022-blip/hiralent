"use client";
import React, { useState, useRef } from "react";
import { Smile, Paperclip, Mic, Star, EllipsisVertical } from "lucide-react";
import VoiceMessage from "./VoiceMessage";

type MessageType = "text" | "file" | "voice";

interface Message {
  id: number;
  sender: string;
  type: MessageType;
  content?: string;
  fileName?: string;
  size?: string;
  time: string;
  audioUrl?: string;
}

function UserChats() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "Partners Success",
      type: "text",
      content:
        "Dear Ana, Thank you for your interest in the ‘Front-end Developer’ position at TechNova Inc. While we were impressed by your background.",
      time: "2:45",
    },
    {
      id: 2,
      sender: "Ana amiri",
      type: "voice",
      content: "Voice note",
      audioUrl: "voice.mp3", // dummy audio
      time: "2:45",
    },
    {
      id: 3,
      sender: "Partners Success",
      type: "file",
      fileName: "Job_Description.pdf",
      size: "74.7 KB",
      time: "2:45",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // send text
  const handleSendText = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: messages.length + 1,
      sender: "Ana amiri",
      type: "text",
      content: newMessage,
      time: "Just now",
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  // file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    const msg: Message = {
      id: messages.length + 1,
      sender: "Ana amiri",
      type: "file",
      fileName: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      time: "Just now",
    };

    setMessages((prev) => [...prev, msg]);
  };

  // voice recording
  const handleToggleRecording = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunks.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: "audio/mp3",
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          const msg: Message = {
            id: messages.length + 1,
            sender: "Ana amiri",
            type: "voice",
            audioUrl,
            content: "Voice message",
            time: "Just now",
          };

          setMessages((prev) => [...prev, msg]);
        };

        mediaRecorder.start();
        setRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  };

  return (
    <div className="bg-gray-50 w-full flex flex-col rounded-xl h-screen">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-2 py-2 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
            P
          </div>
          <div>
            <h3 className="font-semibold text-sm">Partners Success</h3>
            <p className="text-xs text-gray-400">Last seen 15 minutes ago</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Star />
          <EllipsisVertical />
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto bg-white px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "Ana amiri" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-3 py-2 rounded-xl shadow ${
                msg.sender === "Ana amiri"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-700 rounded-bl-none"
              }`}
            >
              {msg.type === "text" && <p className="text-sm">{msg.content}</p>}

              {msg.type === "file" && (
                <div>
                  <p className="text-sm font-medium">{msg.fileName}</p>
                  <span className="text-xs text-gray-400">{msg.size}</span>
                </div>
              )}

              {msg.type === "voice" && msg.audioUrl && (
                <VoiceMessage
                  audioUrl={msg.audioUrl}
                  isSender={msg.sender === "Ana amiri"}
                  avatarUrl={
                    msg.sender !== "Ana amiri"
                      ? "https://i.pravatar.cc/100"
                      : ""
                  }
                  time={msg.time}
                />
              )}

              <p className="text-[10px] text-gray-300 mt-1 text-right">
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-white">
        <div className="w-full border rounded-full gap-2 py-3 px-2 flex items-center">
          {/* File Upload */}
          <label>
            <Paperclip className="text-gray-500 cursor-pointer" />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>

          {/* Input */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            placeholder="Write a message..."
            className="flex-1 text-sm border-none outline-none"
          />

          {/* Emoji (placeholder – can add emoji picker lib) */}
          <Smile className="text-gray-500 cursor-pointer" />

          {/* Voice Recording */}
          <Mic
            className={`cursor-pointer ${
              recording ? "text-red-500" : "text-gray-500"
            }`}
            onClick={handleToggleRecording}
          />
        </div>
      </div>
    </div>
  );
}

export default UserChats;
