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
import TextMessage from "./TextMessage";
import FileMessage from "./FileMessage";
import MediaMessage from "./MediaMessage";
import VoiceMessage from "./VoiceMessage";
import CameraCapture from "./CameraCapture";
import EmojiPicker from "emoji-picker-react";

// Universal types
export type MessageType = "text" | "voice" | "image" | "video" | "file" | "location";

export interface LegacyMessage {
    id: string | number;
    sender: "me" | "them";
    text: string;
    type: MessageType;
    fileName?: string;
    timestamp: string;
    replyTo?: {
        sender: "me" | "them";
        text: string;
        type: MessageType;
        fileName?: string;
    };
}

export interface LegacyConversation {
    id: string | number;
    name: string;
    avatar: string;
    lastSeen: string;
    unreadCount?: number;
    isActive?: boolean;
    messages: LegacyMessage[];
}

export interface BackendConversation {
    conversation_id: string;
    other_participant: {
        user_id: string;
        full_name: string;
        profile_picture_url?: string | null;
        role: string;
        is_online?: boolean;
    };
    unread_count: number;
    last_message_at: string | null;
}

type UniversalConversation = LegacyConversation | BackendConversation;

interface ChatWindowProps {
    conversation: UniversalConversation | null;
    onBack: () => void;
    onSendMessage: (chatId: string | number, msg: LegacyMessage) => void;
    typingUsers?: Set<string>;
    isLoading?: boolean;
}

// Helper functions
const isLegacyConversation = (conv: UniversalConversation): conv is LegacyConversation => {
    return 'messages' in conv && Array.isArray(conv.messages);
};

const normalizeConversation = (conv: UniversalConversation | null): LegacyConversation | null => {
    if (!conv) return null;
    
    if (isLegacyConversation(conv)) {
        return conv;
    }
    
    // Convert backend to legacy format
    return {
        id: conv.conversation_id,
        name: conv.other_participant.full_name,
        avatar: conv.other_participant.profile_picture_url || '/images/default-avatar.png',
        lastSeen: conv.other_participant.is_online ? "Online" : "Offline",
        unreadCount: conv.unread_count > 0 ? conv.unread_count : undefined,
        isActive: conv.other_participant.is_online || false,
        messages: [] // Messages loaded separately
    };
};

export default function ChatWindow({
    conversation,
    onBack,
    onSendMessage,
    typingUsers = new Set(),
    isLoading = false
}: ChatWindowProps) {
    const [inputText, setInputText] = useState("");
    const [showAttachments, setShowAttachments] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{
        type: "image" | "video";
        src: string;
    } | null>(null);

    // Reply, delete, and reactions
    const [replyTo, setReplyTo] = useState<LegacyMessage | null>(null);
    const [deletedIds, setDeletedIds] = useState<(string | number)[]>([]);
    const [reactions, setReactions] = useState<Record<string | number, string | undefined>>({});

    const attachmentRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Normalize conversation
    const normalizedConversation = normalizeConversation(conversation);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [normalizedConversation?.messages]);

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
            if (e.key === "Escape") {
                setPreviewMedia(null);
                setReplyTo(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (!normalizedConversation) {
        return (
            <div className="flex items-center justify-center w-full text-[#A5A5A5] text-sm">
                {isLoading ? (
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading conversation...</span>
                    </div>
                ) : (
                    "Select a chat to start messaging"
                )}
            </div>
        );
    }

    // Helper to create and send message
    const createAndSend = async (type: MessageType, text: string, fileName?: string, file?: File) => {
        if (!normalizedConversation) return;

        let fileUrl = text;
        let actualFileName = fileName;

        // Handle file upload if file is provided
        if (file && type !== 'text') {
            setIsUploading(true);
            try {
                // Simulate file upload (replace with actual upload logic)
                const formData = new FormData();
                formData.append('file', file);
                
                // Add your file upload API call here
                // const uploadResult = await uploadFile(formData);
                
                fileUrl = URL.createObjectURL(file); // Temporary for demo
                actualFileName = file.name;
            } catch (error) {
                console.error('File upload error:', error);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        const msg: LegacyMessage = {
            id: Date.now(),
            sender: "me",
            text: type === 'text' ? text : (actualFileName || 'File'),
            type,
            fileName: actualFileName,
            timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
            replyTo: replyTo ? {
                sender: replyTo.sender,
                text: replyTo.text,
                type: replyTo.type,
                fileName: replyTo.fileName,
            } : undefined,
        };

        onSendMessage(normalizedConversation.id, msg);
        setReplyTo(null);
    };

    const handleSendText = () => {
        const trimmed = inputText.trim();
        if (!trimmed || isUploading) return;
        createAndSend("text", trimmed);
        setInputText("");
        setShowEmoji(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    const handlePhotoVideoUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                alert("Only image or video files are allowed.");
                return;
            }
            const type: MessageType = file.type.startsWith("video/") ? "video" : "image";
            await createAndSend(type, URL.createObjectURL(file), file.name, file);
        };
        input.click();
        setShowAttachments(false);
    };

    const handleFileUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            await createAndSend("file", URL.createObjectURL(file), file.name, file);
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
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                await createAndSend("image", URL.createObjectURL(file), file.name, file);
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
            (position) => {
                const { latitude, longitude } = position.coords;
                const locationText = `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                createAndSend("location", locationText);
            },
            () => alert("Failed to get location.")
        );
        setShowAttachments(false);
    };

    const startRecording = () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Audio recording not supported.");
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: "audio/wav" });
                const file = new File([blob], `voice-message-${Date.now()}.wav`, { type: "audio/wav" });
                await createAndSend("voice", URL.createObjectURL(blob), file.name, file);
                stream.getTracks().forEach(track => track.stop());
            };

            setMediaRecorder(recorder);
            recorder.start();
            setIsRecording(true);
        }).catch(() => {
            alert("Microphone access denied.");
        });
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    // Message actions
    const handleDeleteMessage = (id: string | number) => {
        setDeletedIds((prev) => [...prev, id]);
    };

    const handleReactMessage = (id: string | number, emoji: string) => {
        setReactions((prev) => ({ ...prev, [id]: emoji }));
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderMessage = (msg: LegacyMessage): React.ReactNode => {
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

    const renderTypingIndicator = () => {
        if (typingUsers.size === 0) return null;
        
        const typingArray = Array.from(typingUsers);
        const typingText = typingArray.length === 1 
            ? `${typingArray[0]} is typing...` 
            : `${typingArray.length} people are typing...`;

        return (
            <div className="flex justify-start mb-2">
                <div className="bg-gray-100 rounded-xl px-4 py-2 max-w-[70%]">
                    <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{typingText}</span>
                    </div>
                </div>
            </div>
        );
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
                            src={normalizedConversation.avatar}
                            alt={normalizedConversation.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = '/images/default-avatar.png';
                            }}
                        />
                        {normalizedConversation.isActive && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </div>
                    <div className="ml-3 flex-1">
                        <h2 className="font-semibold text-gray-800">{normalizedConversation.name}</h2>
                        <p className="text-xs text-gray-500">{normalizedConversation.lastSeen}</p>
                    </div>
                </div>

                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-3">
                    {(normalizedConversation.messages ?? []).map((m) => renderMessage(m))}
                    {renderTypingIndicator()}
                    <div ref={messagesEndRef} />
                </div>

                {/* REPLY PREVIEW */}
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
                        disabled={isUploading}
                    >
                        <Paperclip size={20} />
                    </button>

                    {showAttachments && (
                        <div className="absolute bottom-14 left-3 bg-white shadow-xl rounded-2xl py-2 w-56 z-50 border border-gray-100">
                            <button
                                onClick={handlePhotoVideoUpload}
                                className="flex items-center gap-3 hover:bg-gray-50 px-4 py-3 w-full text-left text-sm"
                                disabled={isUploading}
                            >
                                <ImageIcon size={18} className="text-blue-600" />
                                Photo/Video
                            </button>
                            <button
                                onClick={handleFileUpload}
                                className="flex items-center gap-3 hover:bg-gray-50 px-4 py-3 w-full text-left text-sm"
                                disabled={isUploading}
                            >
                                <FileIcon size={18} className="text-green-600" />
                                Document
                            </button>
                            <button
                                onClick={handleCameraClick}
                                className="flex items-center gap-3 hover:bg-gray-50 px-4 py-3 w-full text-left text-sm"
                                disabled={isUploading}
                            >
                                <CameraIcon size={18} className="text-purple-600" />
                                Camera
                            </button>
                            <button
                                onClick={handleShareLocation}
                                className="flex items-center gap-3 hover:bg-gray-50 px-4 py-3 w-full text-left text-sm"
                                disabled={isUploading}
                            >
                                <MapPin size={18} className="text-red-600" />
                                Location
                            </button>
                        </div>
                    )}

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                        disabled={isUploading}
                        className="flex-1 px-2 py-2 bg-transparent text-sm outline-none placeholder-gray-400 disabled:opacity-50"
                    />

                    <button
                        onClick={() => {
                            setShowEmoji((s) => !s);
                            setShowAttachments(false);
                        }}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600"
                        disabled={isUploading}
                    >
                        <Smile size={20} />
                    </button>

                    {showEmoji && (
                        <div className="absolute bottom-14 right-3 z-50">
                            <EmojiPicker
                                onEmojiClick={(emojiObj) => {
                                    setInputText((prev) => prev + emojiObj.emoji);
                                    setShowEmoji(false);
                                }}
                            />
                        </div>
                    )}

                    {!isRecording ? (
                        inputText.trim() ? (
                            <button
                                onClick={handleSendText}
                                disabled={isUploading}
                                className="p-1 sm:p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white disabled:opacity-50"
                            >
                                <Send size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={startRecording}
                                disabled={isUploading}
                                className="p-1 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600 disabled:opacity-50"
                            >
                                <Mic size={20} />
                            </button>
                        )
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="p-1 sm:p-2 bg-red-600 hover:bg-red-700 rounded-full text-white animate-pulse"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* CAMERA MODAL */}
            {showCamera && (
                <CameraCapture
                    onClose={() => setShowCamera(false)}
                    onCapture={async (blob) => {
                        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
                        await createAndSend("image", URL.createObjectURL(blob), file.name, file);
                        setShowCamera(false);
                    }}
                />
            )}

            {/* MEDIA PREVIEW MODAL */}
            {previewMedia && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="relative max-w-4xl max-h-4xl">
                        <button
                            onClick={() => setPreviewMedia(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                        >
                            <X size={32} />
                        </button>
                        {previewMedia.type === "image" ? (
                            <img
                                src={previewMedia.src}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain"
                            />
                        ) : (
                            <video
                                src={previewMedia.src}
                                controls
                                className="max-w-full max-h-full object-contain"
                                autoPlay
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}