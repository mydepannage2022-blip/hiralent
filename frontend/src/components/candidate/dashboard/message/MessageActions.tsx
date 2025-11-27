// src/components/candidate/dashboard/message/MessageActions.tsx
"use client";
import React from "react";
import { 
  Reply, 
  Trash2, 
  Copy, 
  Heart,
  MoreVertical,
  Download,
  Forward,
  Star
} from "lucide-react";

interface MessageActionsProps {
  onReply?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onReact?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onDownload?: () => void;
  isMine: boolean;
  isCompact?: boolean;
}

export default function MessageActions({
  onReply,
  onDelete,
  onCopy,
  onReact,
  onForward,
  onStar,
  onDownload,
  isMine,
  isCompact = false,
}: MessageActionsProps) {
  const actions = [
    {
      icon: Reply,
      label: "Reply",
      onClick: onReply,
      show: !!onReply,
      color: "text-gray-600 hover:text-blue-600",
    },
    {
      icon: Heart,
      label: "React", 
      onClick: onReact,
      show: !!onReact,
      color: "text-gray-600 hover:text-red-500",
    },
    {
      icon: Forward,
      label: "Forward",
      onClick: onForward,
      show: !!onForward,
      color: "text-gray-600 hover:text-green-600",
    },
    {
      icon: Star,
      label: "Star",
      onClick: onStar,
      show: !!onStar,
      color: "text-gray-600 hover:text-yellow-500",
    },
    {
      icon: Copy,
      label: "Copy",
      onClick: onCopy,
      show: !!onCopy,
      color: "text-gray-600 hover:text-gray-800",
    },
    {
      icon: Download,
      label: "Download",
      onClick: onDownload,
      show: !!onDownload,
      color: "text-gray-600 hover:text-indigo-600",
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: onDelete,
      show: isMine && !!onDelete,
      color: "text-gray-600 hover:text-red-600",
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  if (visibleActions.length === 0) {
    return null;
  }

  if (isCompact) {
    return (
      <div className="flex gap-1">
        {visibleActions.slice(0, 3).map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={`p-1 rounded-full transition-all duration-200 ${action.color} hover:bg-gray-100`}
              title={action.label}
            >
              <Icon size={14} />
            </button>
          );
        })}
        {visibleActions.length > 3 && (
          <button className="p-1 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200">
            <MoreVertical size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 bg-white shadow-xl rounded-lg border border-gray-200 p-1 min-w-[80px]">
      {visibleActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-all duration-200 ${action.color} hover:bg-gray-50`}
            title={action.label}
          >
            <Icon size={12} />
            <span className="hidden sm:inline whitespace-nowrap">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Export types for use in other components
export type { MessageActionsProps };