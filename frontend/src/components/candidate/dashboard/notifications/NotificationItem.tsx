// src/components/candidate/dashboard/notifications/NotificationItem.tsx
'use client';
import React from 'react';
import { Star, Mail, MailOpen } from 'lucide-react';
import StyledCheckbox from '../../../company/dashboard/postjob/StyledCheckbox';

export type NotificationTag = 'Message' | 'Apply Result' | 'New Job';

export type Notification = {
    id: string;
    title: string;
    tag: NotificationTag;
    time: string;
    starred?: boolean;
    read?: boolean;
};

const tagStyles: Record<NotificationTag, string> = {
    Message: 'text-[#DC0000] border border-[#DC0000]',
    'Apply Result': 'text-[#009E00] border border-[#009E00]',
    'New Job': 'text-[#005DDC] border border-[#005DDC]',
};

interface NotificationItemProps extends Notification {
    selected: boolean;
    onToggle: () => void;
    onStarToggle: () => void;
    onReadToggle: () => void;
}

export default function NotificationItem({
    title,
    tag,
    time,
    starred = false,
    read = false,
    selected,
    onToggle,
    onStarToggle,
    onReadToggle,
}: NotificationItemProps) {
    return (
        <div
            className={`group relative flex items-start gap-2 sm:gap-4 border border-[#EDEDED] px-2 py-4 sm:p-4 transition
        ${!read ? 'bg-[#F4F4F4]' : 'bg-white'} hover:bg-gray-50`}
        >
            {/* Left: checkbox */}
            <div className="flex-shrink-0 pt-1">
                <StyledCheckbox label="" checked={selected} onChange={onToggle} />
            </div>

            {/* Main content */}
            <div className="flex-1 pr-10 sm:pr-28"> {/* pr to leave room for right-side absolute elements */}
                <div className={`text-xs sm:text-[15px] ${!read ? 'font-semibold' : ''}`}>
                    {title}
                </div>

                <div className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-sm mt-3 ${tagStyles[tag]}`}>
                    {tag}
                </div>
            </div>

            {/* Top-right icons (absolute) */}
            <div className="absolute right-4 top-3 flex items-center gap-1 sm:gap-3">
                {/* Star: visible only on hover when inactive; always visible when starred */}
                <button
                    onClick={onStarToggle}
                    aria-label={starred ? 'Unstar notification' : 'Star notification'}
                    className={`transition-opacity duration-150 cursor-pointer ${starred ? 'opacity-100 text-[#F6B500]' : 'opacity-0 group-hover:opacity-100 text-[#515151]'
                        }`}
                >
                    <Star
                        className={`w-3 h-3 sm:w-5 sm:h-5 ${starred ? 'fill-yellow-400' : 'fill-none'}`}
                        strokeWidth={1.5}
                    />
                </button>

                {/* Mail icon: always visible when unread; if read -> hidden until hover */}
                <button
                    onClick={onReadToggle}
                    aria-label={read ? 'Mark as unread' : 'Mark as read'}
                    className={`transition-opacity duration-150  cursor-pointer ${read ? 'opacity-0 group-hover:opacity-100 text-[#515151]' : 'opacity-100 text-[#005DDC]'
                        }`}
                >
                    {read ? (
                        <MailOpen className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={1.5} />
                    ) : (
                        <Mail className="w-3 h-3 sm:w-5 sm:h-5" strokeWidth={1.5} />
                    )}
                </button>
            </div>

            {/* Bottom-right time (absolute) */}
            <span className="absolute right-4 bottom-3 text-xs text-[#A5A5A5]">
                {time}
            </span>
        </div>
    );
}
