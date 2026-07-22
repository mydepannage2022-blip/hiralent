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
import { useAddReaction, useRemoveReaction, useDeleteMessage } from "../../../../lib/message/message.queries";
import { getSocket } from "@/src/lib/message/socket.client";

// Universal types
export type MessageType = "text" | "voice" | "image" | "video" | "file" | "location";

export interface MessageReaction {
    reaction_id: string;
    emoji: string;
    user_id: string;
    user_name: string;
    created_at: string;
}

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
    reactions?: MessageReaction[];
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
        avatar: conv.other_participant.profile_picture_url || '/images/candidate.jpg',
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
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const recordingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{
        type: "image" | "video";
        src: string;
    } | null>(null);

    // Reply, delete, and reactions
    const [replyTo, setReplyTo] = useState<LegacyMessage | null>(null);
    const [deletedIds, setDeletedIds] = useState<(string | number)[]>([]);
    const [reactions, setReactions] = useState<Record<string | number, string | undefined>>({});
    const addReactionMutation = useAddReaction();
    const removeReactionMutation = useRemoveReaction();
    const deleteMessageMutation = useDeleteMessage();
    const attachmentRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Normalize conversation
    const normalizedConversation = normalizeConversation(conversation);

    // Clear local reactions state when conversation changes
    useEffect(() => {
        setReactions({});
        setDeletedIds([]);
    }, [normalizedConversation?.id]);

    useEffect(() => {
        const messageCount = normalizedConversation?.messages?.length || 0;
        if (messageCount > 0) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                    inline: "nearest"
                });
            });
        }
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
        if (file && type !== 'text' && type !== 'location') {
            setIsUploading(true);
            try {
                console.log('📤 Processing file...', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });

                // Use blob URL for immediate preview (works locally)
                fileUrl = URL.createObjectURL(file);
                actualFileName = file.name;

                // Try to upload to server in background (don't block if it fails)
                try {
                    const { uploadMessageFile } = await import('../../../../lib/message/message.api');
                    const uploadResult = await uploadMessageFile(file);

                    if (uploadResult.success && uploadResult.data) {
                        // Update with server URL if upload succeeds
                        fileUrl = uploadResult.data.file_url;
                        console.log('✅ File uploaded to server:', fileUrl);
                    }
                } catch (uploadError) {
                    // Upload failed but continue with blob URL for local preview
                    console.warn('⚠️ Server upload failed, using local preview:', uploadError);
                }

            } catch (error: any) {
                console.error('❌ File processing error:', error);
                alert(`Failed to process file: ${error.message || 'Unknown error'}`);
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        const msg: LegacyMessage = {
            id: Date.now(),
            sender: "me",
            text: type === 'text' || type === 'location' ? text : fileUrl,
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

        // Request high-quality audio
        navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 48000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        }).then((stream) => {
            // Check for supported MIME types
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

            const recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000 // 128kbps for better quality
            });

            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                if (chunks.length === 0) {
                    alert("No audio recorded. Please try again.");
                    return;
                }

                const blob = new Blob(chunks, { type: mimeType });

                // Check if blob has data
                if (blob.size === 0) {
                    alert("Recording failed. Please try again.");
                    return;
                }

                const fileExtension = mimeType.includes('webm') ? 'webm' : 'mp4';
                const file = new File([blob], `voice-message-${Date.now()}.${fileExtension}`, { type: mimeType });

                console.log('🎤 Voice recorded:', {
                    size: blob.size,
                    type: mimeType,
                    estimatedDuration: (blob.size * 8) / 128000 // seconds
                });

                // Create object URL for playback
                const audioUrl = URL.createObjectURL(blob);
                await createAndSend("voice", audioUrl, file.name, file);
            };

            recorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                alert('Recording error occurred.');
            };

            setMediaRecorder(recorder);
            recorder.start(1000); // Collect data every 1 second for better quality
            setIsRecording(true);
            setRecordingTime(0);

            // Start recording timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            console.log('🎤 Recording started with', mimeType);
        }).catch((error) => {
            console.error('Microphone error:', error);
            alert("Microphone access denied or not available.");
        });
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            setRecordingTime(0);

            // Clear timer
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }
    };

    // Format recording time
    const formatRecordingTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Message actions
    const handleDeleteMessage = async (id: string | number) => {
        const messageId = String(id);
        const socket = getSocket();
        const conversationId = normalizedConversation?.id;

        // Optimistically hide from UI
        setDeletedIds((prev) => [...prev, id]);

        try {
            // Emit socket event for real-time
            if (socket && conversationId) {
                socket.emit('delete_message', {
                    message_id: messageId,
                    conversation_id: String(conversationId)
                });
            }

            // Also call API for persistence
            await deleteMessageMutation.mutateAsync(messageId);
            console.log('✅ Message deleted:', messageId);
        } catch (error) {
            console.error('❌ Failed to delete message:', error);
            // Revert if failed
            setDeletedIds((prev) => prev.filter(deletedId => deletedId !== id));
        }
    };

    const handleReactMessage = async (id: string | number, emoji: string) => {
        const messageId = String(id);
        const existingReaction = reactions[id];
        
        const socket = getSocket();
        if (!socket || !conversation) return;
        
        // Get conversation_id from normalized conversation
        const conversationId = normalizedConversation?.id;
        if (!conversationId) {
            console.error('No conversation ID found');
            return;
        }
        
        if (existingReaction === emoji) {
            // Remove via socket
            socket.emit('remove_reaction', {
                message_id: messageId,
                conversation_id: conversationId
            });
            
            setReactions((prev) => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        } else {
            // Add via socket
            socket.emit('add_reaction', {
                message_id: messageId,
                conversation_id: conversationId,
                emoji: emoji
            });
            
            setReactions((prev) => ({ ...prev, [id]: emoji }));
        }
    };



    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderMessage = (msg: LegacyMessage): React.ReactNode => {
        if (deletedIds.includes(msg.id)) return null;
        // Use reactions from backend message data, fallback to local state for optimistic updates
        const backendReaction = msg.reactions && msg.reactions.length > 0 ? msg.reactions[0].emoji : undefined;
        const reaction = backendReaction || reactions[msg.id];

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
            <div className="flex flex-col w-full h-full max-h-screen bg-white">
                {/* HEADER */}
                <div className="flex-shrink-0 flex items-center py-3 px-4 border-b border-gray-100">
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
                                e.currentTarget.src = '/images/candidate.jpg';
                            }}
                        />
                        {normalizedConversation.isActive && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </div>
                    <div className="ml-3 flex-1">
                        <h2 className="font-semibold text-gray-800 text-sm sm:text-base">{normalizedConversation.name}</h2>
                        <p className="text-xs text-gray-500">{normalizedConversation.lastSeen}</p>
                    </div>
                </div>

                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-2 sm:space-y-3" style={{maxHeight: 'calc(100vh - 200px)'}}>
                    {(normalizedConversation.messages ?? []).map((m) => renderMessage(m))}
                    {renderTypingIndicator()}
                    <div ref={messagesEndRef} />
                </div>

                {/* REPLY PREVIEW */}
                {replyTo && (
                    <div className="flex-shrink-0 mx-2 sm:mx-4 mb-2 p-2 rounded-lg flex items-center justify-between border-l-4 border-blue-600 bg-white shadow-sm">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs sm:text-sm font-semibold text-blue-600">
                                {replyTo.sender === "me" ? "You" : "Them"}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[180px] sm:max-w-[230px]">
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
                    className="flex-shrink-0 py-1 px-2 flex items-center sm:gap-2 relative bg-white border border-gray-300 rounded-xl mx-2 sm:mx-4 mb-2 sm:mb-4"
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
                                title="Record voice message"
                            >
                                <Mic size={20} />
                            </button>
                        )
                    ) : (
                        <div className="flex items-center gap-2 flex-1">
                            <div className="flex items-center gap-2 bg-red-50 rounded-full px-3 py-1 flex-1">
                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                <span className="text-sm text-red-600 font-medium">Recording...</span>
                                <span className="text-sm text-red-600 font-mono">{formatRecordingTime(recordingTime)}</span>
                            </div>
                            <button
                                onClick={stopRecording}
                                className="p-1 sm:p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all hover:scale-110"
                                title="Stop and send"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CAMERA MODAL */}
            {showCamera && (
                <CameraCapture
                    onClose={() => setShowCamera(false)}
                    onCapture={async (dataUrl) => {
                        // CameraCapture emits a base64 data URL — convert to a real Blob before upload.
                        try {
                            const blob = await (await fetch(dataUrl)).blob();
                            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
                            await createAndSend("image", URL.createObjectURL(blob), file.name, file);
                        } catch (err) {
                            console.error("Camera capture upload failed:", err);
                        } finally {
                            setShowCamera(false);
                        }
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