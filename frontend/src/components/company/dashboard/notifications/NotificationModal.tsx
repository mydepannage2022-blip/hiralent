'use client';
import React, { useEffect, useState } from 'react';
import NotificationItem, { Notification, NotificationTag } from './NotificationItem';
import NotificationFilter, { FilterOption } from './NotificationFilter';
import StyledCheckbox from '../../../company/dashboard/postjob/StyledCheckbox';

interface NotificationModalProps {
    notifications: Notification[];
    onUpdate: (n: Notification[]) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationModal({
    notifications,
    onUpdate,
    isOpen,
    onClose,
}: NotificationModalProps) {
    const [activeFilter, setActiveFilter] = useState<NotificationTag | 'All'>('All');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ✅ Only include allowed tags — no Apply Result
    const filters: FilterOption<NotificationTag | 'All'>[] = [
        { label: 'All', value: 'All' },
        { label: 'New Applications', value: 'New Applications' },
        { label: 'Messages', value: 'Message' },
        { label: 'Meetings', value: 'Meeting' },
    ];

    const filtered =
        activeFilter === 'All'
            ? notifications
            : notifications.filter((n) => n.tag === activeFilter);

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) setSelectedIds([]);
        else setSelectedIds(filtered.map((n) => n.id));
    };

    const toggleItem = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const updateNotification = (id: string, changes: Partial<Notification>) => {
        onUpdate(notifications.map((n) => (n.id === id ? { ...n, ...changes } : n)));
    };

    // ✅ Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('#notification-modal') && !target.closest('#notification-bell')) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            id="notification-modal"
            className="absolute right-[-35px] sm:right-0 mt-3 w-[90vw] sm:w-[360px] md:w-[400px] bg-white shadow-lg border border-gray-200 rounded-xl p-4 z-50 max-w-[400px]"
        >
            {/* Header: Select All + Filter */}
            <div className="flex justify-between items-center mb-3 gap-2">
                <StyledCheckbox
                    label=""
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                />
                <NotificationFilter
                    activeFilter={activeFilter}
                    onChange={setActiveFilter}
                    filters={filters}
                />
            </div>

            {/* Notification List */}
            <div className="max-h-[150px] sm:max-h-[300px] overflow-y-auto">
                {filtered.length > 0 ? (
                    filtered.map((n) => (
                        <NotificationItem
                            key={n.id}
                            {...n}
                            selected={selectedIds.includes(n.id)}
                            onToggle={() => toggleItem(n.id)}
                            onStarToggle={() => updateNotification(n.id, { starred: !n.starred })}
                            onReadToggle={() => updateNotification(n.id, { read: !n.read })}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                        <p className="text-sm">No notifications found</p>
                    </div>
                )}
            </div>
        </div>
    );
}