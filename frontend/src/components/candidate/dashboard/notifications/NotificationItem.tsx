'use client';
import React from 'react';
import { Star, Mail, MailOpen, MessageSquare, Briefcase, CheckCircle } from 'lucide-react';
import StyledCheckbox from '../../../company/dashboard/postjob/StyledCheckbox';

export type NotificationTag = 'Message' | 'Apply Result' | 'New Job';

export type Notification = {
  id: string;
  title: string;
  message?: string;
  tag: NotificationTag;
  time: string;
  starred?: boolean;
  read?: boolean;
};

interface NotificationItemProps extends Notification {
  selected: boolean;
  onToggle: () => void;
  onStarToggle: () => void;
  onReadToggle: () => void;
}

const tagConfig: Record<
  NotificationTag,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  Message:        { label: 'Message',      color: '#DC2626', bg: '#FEF2F2', Icon: MessageSquare },
  'Apply Result': { label: 'Apply Result', color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
  'New Job':      { label: 'New Job',      color: '#2563EB', bg: '#EFF6FF', Icon: Briefcase },
};

export default function NotificationItem({
  title,
  message,
  tag,
  time,
  starred = false,
  read = false,
  selected,
  onToggle,
  onStarToggle,
  onReadToggle,
}: NotificationItemProps) {
  const cfg = tagConfig[tag];
  const { Icon } = cfg;

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 ${
        !read ? 'bg-[#F8F9FB]' : 'bg-white'
      } hover:bg-[#F1F3F7]`}
      style={{ borderBottom: '1px solid #EBEBEB' }}
    >
      {/* Unread left bar */}
      {!read && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: '#2563EB' }}
        />
      )}

      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5">
        <StyledCheckbox label="" checked={selected} onChange={onToggle} />
      </div>

      {/* Icon avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon className="w-[15px] h-[15px]" style={{ color: cfg.color }} strokeWidth={1.8} />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 pr-20">
        <p
          className={`text-[13.5px] leading-snug truncate ${
            !read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          }`}
        >
          {title}
        </p>

        {message && (
          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
            {message}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span className="text-[11px] text-gray-400">{time}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <button
          onClick={onStarToggle}
          aria-label={starred ? 'Unstar' : 'Star'}
          className={`p-1 rounded transition-all duration-150 cursor-pointer ${
            starred
              ? 'opacity-100 text-amber-400'
              : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-400'
          }`}
        >
          <Star
            className="w-[15px] h-[15px]"
            fill={starred ? 'currentColor' : 'none'}
            strokeWidth={1.8}
          />
        </button>

        <button
          onClick={onReadToggle}
          aria-label={read ? 'Mark unread' : 'Mark read'}
          className={`p-1 rounded transition-all duration-150 cursor-pointer ${
            read
              ? 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500'
              : 'opacity-100 text-blue-500'
          }`}
        >
          {read ? (
            <MailOpen className="w-[15px] h-[15px]" strokeWidth={1.8} />
          ) : (
            <Mail className="w-[15px] h-[15px]" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </div>
  );
}