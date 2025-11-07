"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Smile,
  Paperclip,
  Mic,
  Star,
  EllipsisVertical,
  Image as ImageIcon,
  File as FileIcon,
  Camera as CameraIcon,
  MapPin,
  X,
} from "lucide-react";
import VoiceMessage from "./VoiceMessage";

type MessageType = "text" | "file" | "voice" | "location" | "media";

interface Message {
  id: number;
  sender: string;
  type: MessageType;
  content?: string;
  fileName?: string;
  size?: string;
  time: string;
  audioUrl?: string;
  fileUrl?: string;
  mediaType?: "image" | "video";
  reactions?: string[];
}

interface UserChatsProps {
  chat: {
    id: number;
    company: string;
    time: string;
  };
}

export default function UserChats({ chat }: UserChatsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);

  // camera modal
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // file refs
  const photoVideoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // click-outside refs
  const attachRef = useRef<HTMLDivElement | null>(null);
  const emojiRef = useRef<HTMLDivElement | null>(null);
  const attachButtonRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLDivElement | null>(null);

  const emojiSet = [
    "😀", "😃", "😄", "😁", "😆", "🥹", "😂", "🤣", "😊", "😍",
    "😘", "🥰", "😎", "🤩", "😉", "😇", "🤗", "🤔", "😐", "😴",
    "😢", "😭", "😡", "🔥", "❤️", "💯", "👏", "🙏", "🎉", "💪",
  ];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        showAttachOptions &&
        attachRef.current &&
        attachButtonRef.current &&
        !attachRef.current.contains(target) &&
        !attachButtonRef.current.contains(target)
      ) {
        setShowAttachOptions(false);
      }

      if (
        showEmojiPicker &&
        emojiRef.current &&
        emojiButtonRef.current &&
        !emojiRef.current.contains(target) &&
        !emojiButtonRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachOptions, showEmojiPicker]);

  useEffect(() => {
    const chatMessages: Record<number, Message[]> = {
      1: [
        {
          id: 1,
          sender: chat.company,
          type: "text",
          content: "Hey Ana, just reviewing your application for Frontend Developer at TechNova Inc.",
          time: "2:45",
        },
        {
          id: 2,
          sender: "Ana amiri",
          type: "voice",
          audioUrl: "voice.mp3",
          time: "2:46",
        },
      ],
      2: [
        {
          id: 1,
          sender: chat.company,
          type: "text",
          content: "Hi Ana! Thanks for connecting with CodeCrafters. We received your resume.",
          time: "1:20",
        },
        {
          id: 2,
          sender: "Ana amiri",
          type: "file",
          fileName: "Resume.pdf",
          size: "110 KB",
          time: "1:21",
        },
      ],
    };
    setMessages(chatMessages[chat.id] || []);
  }, [chat]);

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
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (file: File, type: "media" | "file") => {
    if (type === "media" && !file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Only image or video files allowed.");
      return;
    }

    const url = URL.createObjectURL(file);
    const mediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : undefined;

    const msg: Message = {
      id: messages.length + 1,
      sender: "Ana amiri",
      type: type === "media" ? "media" : "file",
      fileName: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      fileUrl: url,
      mediaType,
      time: "Just now",
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const msg: Message = {
        id: messages.length + 1,
        sender: "Ana amiri",
        type: "location",
        content: `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`,
        time: "Just now",
      };
      setMessages((p) => [...p, msg]);
    });
  };

  const handleToggleRecording = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunks.current = [];
        mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunks.current.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks.current, { type: "audio/mp3" });
          const url = URL.createObjectURL(blob);
          const msg: Message = {
            id: messages.length + 1,
            sender: "Ana amiri",
            type: "voice",
            audioUrl: url,
            time: "Just now",
          };
          setMessages((p) => [...p, msg]);
        };
        mediaRecorder.start();
        setRecording(true);
      } catch {
        alert("Microphone access denied.");
      }
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  };

  // CAMERA
  const openCameraModal = async () => {
    setShowAttachOptions(false);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
    } catch (err) {
      alert("Unable to access camera.");
      setShowCameraModal(false);
    }
  };

  const closeCameraModal = () => {
    setShowCameraModal(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      handleFileUpload(file, "media");
      closeCameraModal();
    }, "image/jpeg", 0.9);
  };

  const [messageReactionOpenId, setMessageReactionOpenId] = useState<number | null>(null);
  const addReactionToMessage = (id: number, emoji: string) => {
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, reactions: [...(m.reactions || []), emoji] } : m)));
    setMessageReactionOpenId(null);
  };

  return (
    <div className="w-full flex flex-col rounded-xl h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
            {chat.company.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{chat.company}</h3>
            <p className="text-xs text-gray-400">{chat.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Star />
          <EllipsisVertical />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white px-4 py-3 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages yet</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "Ana amiri" ? "justify-end" : "justify-start"}`}>
              <div
                className={`relative max-w-[70%] px-3 py-2 rounded-xl shadow ${msg.sender === "Ana amiri"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-700 rounded-bl-none"
                  }`}
              >
                {msg.type === "text" && <p className="text-sm">{msg.content}</p>}

                {msg.type === "media" && msg.fileUrl && (
                  <>
                    {msg.mediaType === "image" ? (
                      <img
                        src={msg.fileUrl}
                        alt={msg.fileName}
                        onClick={() => setLightbox({ url: msg.fileUrl!, type: "image" })}
                        className="w-48 h-auto rounded-lg object-cover cursor-pointer"
                      />
                    ) : (
                      <video
                        src={msg.fileUrl}
                        controls
                        className="w-48 h-auto rounded-lg cursor-pointer"
                        onClick={() => setLightbox({ url: msg.fileUrl!, type: "video" })}
                      />
                    )}
                  </>
                )}

                {msg.type === "file" && (
                  <div>
                    <p className="text-sm font-medium">{msg.fileName}</p>
                    <span className="text-xs text-gray-300">{msg.size}</span>
                  </div>
                )}

                {msg.type === "location" && (
                  <a href={msg.content} target="_blank" className="text-sm underline text-blue-200">
                    📍 Shared Location
                  </a>
                )}

                {msg.type === "voice" && msg.audioUrl && (
                  <VoiceMessage audioUrl={msg.audioUrl} isSender={msg.sender === "Ana amiri"} />
                )}

                {/* Reactions */}
                {msg.reactions?.length ? (
                  <div className="flex gap-1 mt-2">
                    {msg.reactions.map((r, i) => (
                      <span key={i}>{r}</span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center justify-end mt-1">
                  <p className="text-[10px] text-gray-300 ml-2">{msg.time}</p>
                  <button
                    onClick={() =>
                      setMessageReactionOpenId((p) => (p === msg.id ? null : msg.id))
                    }
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <Smile size={14} />
                  </button>
                </div>

                {messageReactionOpenId === msg.id && (
                  <div className="absolute -top-24 right-0 bg-white border rounded-lg shadow p-2 flex flex-col gap-1 z-40">
                    {emojiSet.slice(0, 6).map((em, i) => (
                      <button
                        key={i}
                        onClick={() => addReactionToMessage(msg.id, em)}
                        className="hover:bg-gray-100 rounded text-lg"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-3 w-[90%] max-w-md">
            <div className="relative">
              <video ref={videoRef} className="w-full rounded" playsInline />
              <button
                onClick={capturePhotoFromCamera}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full"
              >
                Capture
              </button>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={closeCameraModal} className="px-3 py-2 rounded bg-gray-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[999]">
          <button
            className="absolute top-5 right-5 text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>
          {lightbox.type === "image" ? (
            <img src={lightbox.url} className="max-h-[90%] max-w-[90%] rounded-lg" />
          ) : (
            <video
              src={lightbox.url}
              controls
              className="max-h-[90%] max-w-[90%] rounded-lg"
            />
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t relative">
        {/* Attach Options Popup */}
        {showAttachOptions && (
          <div ref={attachRef} className="absolute bottom-16 left-4 bg-white shadow-md rounded-lg border p-2 flex flex-col gap-2 z-30">
            <button
              onClick={() => {
                setShowAttachOptions(false);
                photoVideoInputRef.current?.click();
              }}
              className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
            >
              <ImageIcon size={16} /> Photo / Video
            </button>
            <button
              onClick={() => {
                setShowAttachOptions(false);
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
            >
              <FileIcon size={16} /> File
            </button>
            <button
              onClick={() => openCameraModal()}
              className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
            >
              <CameraIcon size={16} /> Camera
            </button>
            <button
              onClick={() => {
                setShowAttachOptions(false);
                handleShareLocation();
              }}
              className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
            >
              <MapPin size={16} /> Location
            </button>
          </div>
        )}

        <div className="w-full border rounded-full gap-2 py-3 px-3 flex items-center">
          {/* Attach Button */}
          <div ref={attachButtonRef}>
            <Paperclip
              className="text-gray-500 cursor-pointer"
              onClick={() => setShowAttachOptions((p) => !p)}
            />
          </div>

          <input
            ref={photoVideoInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f, "media");
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f, "file");
              e.target.value = "";
            }}
          />

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            placeholder="Write a message..."
            className="flex-1 text-sm border-none outline-none bg-transparent"
          />

          {/* Emoji picker */}
          <div ref={emojiButtonRef} className="relative">
            <Smile
              className="text-gray-500 cursor-pointer"
              onClick={() => {
                setShowEmojiPicker((p) => !p);
                setShowAttachOptions(false);
              }}
            />
            {showEmojiPicker && (
              <div ref={emojiRef} className="absolute bottom-12 right-0 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-2 w-64 h-56 overflow-y-auto z-50">
                {emojiSet.map((em, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setNewMessage((s) => s + em);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl hover:bg-gray-100 rounded"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Mic
            className={`cursor-pointer ${recording ? "text-red-500" : "text-gray-500"}`}
            onClick={handleToggleRecording}
          />
        </div>
      </div>
    </div>
  );
}