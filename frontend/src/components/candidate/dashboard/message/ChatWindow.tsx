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
    X,
} from "lucide-react";
import { Conversation, Message, MessageType } from "./mockData";
import TextMessage from "./TextMessage";
import FileMessage from "./FileMessage";
import MediaMessage from "./MediaMessage";
import VoiceMessage from "./VoiceMessage";
import CameraCapture from "./CameraCapture";
import EmojiPicker from "emoji-picker-react";

export default function ChatWindow({
    conversation,
    onBack,
    onSendMessage,
}: {
    conversation: Conversation | null;
    onBack: () => void;
    onSendMessage: (chatId: number, msg: Message) => void;
}) {
    const [inputText, setInputText] = useState("");
    const [showAttachments, setShowAttachments] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{
        type: "image" | "video";
        src: string;
    } | null>(null);

    // New: Reply, delete, and reactions
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [reactions, setReactions] = useState<Record<number, string | undefined>>({});

    const attachmentRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation?.messages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (attachmentRef.current && !attachmentRef.current.contains(e.target as Node)) {
                setShowAttachments(false);
                setShowEmoji(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewMedia(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (!conversation) {
        return (
            <div className="flex items-center justify-center w-full text-[#A5A5A5] text-sm">
                Select a chat to start messaging
            </div>
        );
    }

    // ✅ helper to send message (keeps your logic; adds reply snapshot)
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
            replyTo: replyTo
                ? {
                    sender: replyTo.sender,
                    text: replyTo.text,
                    type: replyTo.type,
                    fileName: replyTo.fileName,
                }
                : undefined,
        };
        onSendMessage(conversation.id, msg);
        setReplyTo(null);
    };

    const handleSendText = () => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        createAndSend("text", trimmed);
        setInputText("");
        setShowEmoji(false);
    };

    const handlePhotoVideoUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*";
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                alert("Only image or video files are allowed.");
                return;
            }
            const url = URL.createObjectURL(file);
            const type: MessageType = file.type.startsWith("video/") ? "video" : "image";
            createAndSend(type, url, file.name);
        };
        input.click();
        setShowAttachments(false);
    };

    const handleFileUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "";
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            createAndSend("file", url, file.name);
        };
        input.click();
        setShowAttachments(false);
    };

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
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch {
            alert("Microphone access denied or unavailable.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    // Delete / React / Copy
    const handleDeleteMessage = (id: number) => {
        setDeletedIds((prev) => [...prev, id]);
    };

    const handleReactMessage = (id: number, emoji: string) => {
        setReactions((prev) => ({ ...prev, [id]: emoji }));
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderMessage = (msg: Message): React.ReactNode => {
        if (deletedIds.includes(msg.id)) return null;
        const reaction = reactions[msg.id];
        switch (msg.type) {
            case "text":
            case "location":
                return (
                    <TextMessage
                        key={msg.id}
                        msg={msg}
                        reaction={reaction}
                        onReply={() => setReplyTo(msg)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReact={(emoji) => handleReactMessage(msg.id, emoji)}
                        onCopy={() => handleCopyMessage(msg.text)}
                    />
                );
            case "voice":
                return (
                    <VoiceMessage
                        key={msg.id}
                        msg={msg}
                        reaction={reaction}
                        onReply={() => setReplyTo(msg)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReact={(emoji) => handleReactMessage(msg.id, emoji)}
                        onCopy={() => handleCopyMessage(msg.text)}
                    />
                );
            case "file":
                if (msg.fileName?.includes("voice-message"))
                    return (
                        <VoiceMessage
                            key={msg.id}
                            msg={msg}
                            reaction={reaction}
                            onReply={() => setReplyTo(msg)}
                            onDelete={() => handleDeleteMessage(msg.id)}
                            onReact={(emoji) => handleReactMessage(msg.id, emoji)}
                            onCopy={() => handleCopyMessage(msg.text)}
                        />
                    );
                return (
                    <FileMessage
                        key={msg.id}
                        msg={msg}
                        reaction={reaction}
                        onReply={() => setReplyTo(msg)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReact={(emoji) => handleReactMessage(msg.id, emoji)}
                        onCopy={() => handleCopyMessage(msg.text)}
                    />
                );
            case "image":
            case "video":
            case "camera":
                return (
                    <MediaMessage
                        key={msg.id}
                        msg={msg}
                        onPreview={setPreviewMedia}
                        reaction={reaction}
                        onReply={() => setReplyTo(msg)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReact={(emoji) => handleReactMessage(msg.id, emoji)}
                        onCopy={() => handleCopyMessage(msg.text)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="flex flex-col w-full h-full bg-white">
                {/* HEADER */}
                <div className="flex items-center py-3 px-4 border-b border-gray-100">
                    <button
                        onClick={onBack}
                        className="mr-3 md:hidden text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative">
                        <img
                            src={conversation.avatar}
                            alt={conversation.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        {conversation.isActive && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </div>
                    <div className="ml-3">
                        <h2 className="font-semibold text-gray-800">{conversation.name}</h2>
                        <p className="text-xs text-gray-500">{conversation.lastSeen}</p>
                    </div>
                </div>

                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-3">
                    {(conversation.messages ?? []).map((m) => renderMessage(m))}
                    <div ref={messagesEndRef} />
                </div>

                {/* ✅ WhatsApp-style reply preview above input */}
                {replyTo && (
                    <div className="mx-4 mb-2 p-2 rounded-lg flex items-center justify-between border-l-4 border-blue-600 bg-white shadow-sm">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-blue-600">
                                {replyTo.sender === "me" ? "You" : "Them"}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[230px]">
                                {replyTo.text ||
                                    (replyTo.type === "image"
                                        ? "📷 Photo"
                                        : replyTo.type === "video"
                                            ? "🎥 Video"
                                            : replyTo.type === "file"
                                                ? "📎 File"
                                                : replyTo.type === "voice"
                                                    ? "🎤 Voice message"
                                                    : "Message")}
                            </p>
                        </div>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="ml-2 text-gray-400 hover:text-gray-700 font-bold text-lg leading-none"
                            aria-label="Cancel reply"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* INPUT BAR */}
                <div
                    ref={attachmentRef}
                    className="py-1 px-2 flex items-center sm:gap-2 relative bg-white border border-gray-300 rounded-xl mx-2 sm:mx-4 mb-4"
                >
                    <button
                        onClick={() => {
                            setShowAttachments((s) => !s);
                            setShowEmoji(false);
                        }}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600 mr-1 sm:m-0"
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

                    <input
                        type="text"
                        placeholder="Write a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                        className="flex-1 text-sm sm:text-base outline-none"
                    />

                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowEmoji((s) => !s);
                                setShowAttachments(false);
                            }}
                            className="p-1 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600"
                        >
                            <Smile size={20} />
                        </button>

                        {showEmoji && (
                            <div className="absolute bottom-14 -right-[35px] sm:right-3 z-50 shadow-xl rounded-md">
                                <EmojiPicker
                                    onEmojiClick={(emojiData) =>
                                        setInputText((prev) => prev + emojiData.emoji)
                                    }
                                    height={300}
                                    width={275}
                                />
                            </div>
                        )}
                    </div>

                    {inputText.trim() ? (
                        <button
                            onClick={handleSendText}
                            className="ml-1 sm:m-0 p-0.5 sm:p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700"
                        >
                            <Send size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`ml-1 sm:m-0 p-0.5 sm:p-2 rounded-full ${isRecording ? "bg-red-500 text-white" : "text-gray-600"
                                }`}
                        >
                            <Mic size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* CAMERA */}
            {showCamera && (
                <CameraCapture
                    onClose={() => setShowCamera(false)}
                    onCapture={(dataUrl) => {
                        createAndSend("image", dataUrl, `capture-${Date.now()}.png`);
                        setShowCamera(false);
                    }}
                />
            )}

            {/* PREVIEW */}
            {previewMedia && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
                    <button
                        onClick={() => setPreviewMedia(null)}
                        className="absolute top-4 right-4 text-white text-3xl font-light hover:text-gray-300 z-50"
                        aria-label="Close preview"
                    >
                        &times;
                    </button>
                    {previewMedia.type === "image" ? (
                        <img
                            src={previewMedia.src}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    ) : (
                        <video
                            src={previewMedia.src}
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-lg"
                        />
                    )}
                </div>
            )}
        </>
    );
}