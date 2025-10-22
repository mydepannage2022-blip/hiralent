"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Send,
    Paperclip,
    Image as ImageIcon,
    File as FileIcon,
    Camera as CameraIcon,
    MapPin,
    Mic,
    Smile,
} from "lucide-react";
import { Conversation, Message, MessageType } from "./mockData";
import TextMessage from "./TextMessage";
import FileMessage from "./FileMessage";
import MediaMessage from "./MediaMessage";
import CameraCapture from "./CameraCapture";
// import Picker from "@emoji-mart/react";
// import data from "@emoji-mart/data";

interface ChatWindowProps {
    conversation: Conversation | null;
    onBack: () => void;
    onSendMessage: (chatId: number, msg: Message) => void;
}

export default function ChatWindow({
    conversation,
    onBack,
    onSendMessage,
}: ChatWindowProps) {
    const [inputText, setInputText] = useState("");
    const [showAttachments, setShowAttachments] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const attachmentRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation?.messages]);

    // Close modals on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                attachmentRef.current &&
                !attachmentRef.current.contains(e.target as Node)
            ) {
                setShowAttachments(false);
                setShowEmoji(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (!conversation) {
        return (
            <div className="flex items-center justify-center w-full text-gray-400 text-sm">
                Select a chat to start messaging
            </div>
        );
    }

    // Helper: create and send message
    const createAndSend = (type: MessageType, text: string, fileName?: string) => {
        const msg: Message = {
            id: Date.now(),
            sender: "me",
            text,
            type,
            fileName,
            timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
        onSendMessage(conversation.id, msg);
    };

    // Send text message
    const handleSendText = () => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        createAndSend("text", trimmed);
        setInputText("");
        setShowEmoji(false);
    };

    // Upload photo/video
    const handlePhotoVideoUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*";
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const type: MessageType = file.type.startsWith("video/") ? "video" : "image";
            createAndSend(type, url, file.name);
        };
        input.click();
        setShowAttachments(false);
    };

    // Upload file
    const handleFileUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.txt,.doc,.docx,.xls,.xlsx,.zip,.rar,.ppt,.pptx";
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            createAndSend("file", url, file.name);
        };
        input.click();
        setShowAttachments(false);
    };

    // Camera handler
    const handleCameraClick = () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            (input as any).capture = "environment";
            input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                createAndSend("image", url, file.name);
            };
            input.click();
        } else {
            setShowCamera(true);
        }
        setShowAttachments(false);
    };

    // Share location
    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                createAndSend("location", url);
            },
            () => alert("Unable to access location"),
            { enableHighAccuracy: true }
        );
        setShowAttachments(false);
    };

    // 🎤 Voice Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                createAndSend("file", url, "voice-message.webm");
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start();
            setAudioChunks(chunks);
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            alert("Microphone access denied or not available.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    // Render message
    const renderMessage = (msg: Message): React.ReactNode => {
        switch (msg.type) {
            case "text":
            case "location":
                return <TextMessage key={msg.id} msg={msg} />;
            case "file":
                return <FileMessage key={msg.id} msg={msg} />;
            case "image":
            case "video":
            case "camera":
                return <MediaMessage key={msg.id} msg={msg} />;
            default:
                return null;
        }
    };

    return (
        <>
            <div className="flex flex-col w-full h-full bg-white">
                {/* Header */}
                <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50">
                    <button
                        onClick={onBack}
                        className="mr-3 md:hidden text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="ml-3">
                        <h2 className="font-semibold text-gray-800">{conversation.name}</h2>
                        <p className="text-xs text-gray-500">{conversation.lastSeen}</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-gray-50">
                    {(conversation.messages ?? []).map((m) => renderMessage(m))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
                <div
                    ref={attachmentRef}
                    className="p-3 border-t flex items-center gap-2 relative bg-white"
                >
                    {/* Attachments */}
                    <button
                        onClick={() => {
                            setShowAttachments((s) => !s);
                            setShowEmoji(false);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                    >
                        <Paperclip size={20} />
                    </button>

                    {showAttachments && (
                        <div className="absolute bottom-14 left-3 bg-white shadow-xl rounded-2xl py-2 w-56 z-50 border border-gray-100">
                            <button
                                onClick={handlePhotoVideoUpload}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" /> Photo or Video
                            </button>
                            <button
                                onClick={handleFileUpload}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <FileIcon className="w-4 h-4 mr-2" /> File
                            </button>
                            <button
                                onClick={handleCameraClick}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <CameraIcon className="w-4 h-4 mr-2" /> Camera
                            </button>
                            <button
                                onClick={handleShareLocation}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <MapPin className="w-4 h-4 mr-2" /> Location
                            </button>
                        </div>
                    )}

                    {/* Emoji */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowEmoji((s) => !s);
                                setShowAttachments(false);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                        >
                            <Smile size={20} />
                        </button>

                        {showEmoji && (
                            <div className="absolute bottom-14 left-0 z-50">
                                {/* <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: any) =>
                                        setInputText((prev) => prev + emoji.native)
                                    }
                                /> */}
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <input
                        type="text"
                        placeholder="Write a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {/* Mic / Send */}
                    {inputText.trim() ? (
                        <button
                            onClick={handleSendText}
                            className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700"
                        >
                            <Send size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-full ${isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            <Mic size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <CameraCapture
                    onClose={() => setShowCamera(false)}
                    onCapture={(dataUrl) => {
                        createAndSend("image", dataUrl, `capture-${Date.now()}.png`);
                        setShowCamera(false);
                    }}
                />
            )}
        </>
    );
}