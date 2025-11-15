"use client";
import React, { useState, useRef, useEffect } from "react";
import { EllipsisVertical, Copy, Reply, Trash, Smile } from "lucide-react";

interface MessageActionsProps {
    onCopy?: () => void;
    onReply?: () => void;
    onDelete?: () => void;
    // open floating react bar near the message
    onOpenReactBar?: () => void;
}

export default function MessageActions({
    onCopy,
    onReply,
    onDelete,
    onOpenReactBar,
}: MessageActionsProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((s) => !s)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                aria-label="Message actions"
            >
                <EllipsisVertical size={16} />
            </button>

            {open && (
                <div className="absolute right-0 top-6 w-40 bg-white shadow-lg border border-gray-200 rounded-lg z-50 text-sm overflow-hidden">
                    <button
                        onClick={() => {
                            setOpen(false);
                            onCopy?.();
                        }}
                        className="flex items-center w-full px-3 py-2 hover:bg-gray-50"
                    >
                        <Copy size={14} className="mr-2" /> Copy
                    </button>

                    <button
                        onClick={() => {
                            setOpen(false);
                            onReply?.();
                        }}
                        className="flex items-center w-full px-3 py-2 hover:bg-gray-50"
                    >
                        <Reply size={14} className="mr-2" /> Reply
                    </button>

                    <button
                        onClick={() => {
                            setOpen(false);
                            onOpenReactBar?.();
                        }}
                        className="flex items-center w-full px-3 py-2 hover:bg-gray-50"
                    >
                        <Smile size={14} className="mr-2" /> React
                    </button>

                    <button
                        onClick={() => {
                            setOpen(false);
                            onDelete?.();
                        }}
                        className="flex items-center w-full px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                        <Trash size={14} className="mr-2" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}