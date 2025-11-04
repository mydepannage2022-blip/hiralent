"use client";
import React from "react";
import type { Message } from "./types";

export default function MessageBubble({ message }: { message: Message }) {
    const align = message.fromMe ? "ml-auto" : "mr-auto";
    const bg = message.fromMe ? "bg-blue-50" : "bg-gray-100";

    return (
        <div className={`${align} mb-4 max-w-[80%]`}>
            <div className={`rounded-xl p-3 shadow-sm ${bg}`}>
                {message.type === "text" && <p className="text-sm">{message.text}</p>}

                {message.type === "file" && (
                    <div>
                        <div className="flex gap-3 items-center">
                            <div className="w-14 h-14 bg-white border rounded flex items-center justify-center">📄</div>
                            <div>
                                <div className="text-sm font-medium">{message.fileName}</div>
                                <div className="text-xs text-gray-500">{message.fileSize}</div>
                                <div className="text-xs text-blue-600 mt-2">OPEN WITH</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-xs text-gray-400 mt-2 text-right">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        </div>
    );
}