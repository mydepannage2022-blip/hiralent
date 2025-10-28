'use client';
import React, { useState } from 'react';
import { Bell, Ellipsis, EllipsisVertical, Inbox } from 'lucide-react';
import NotificationFilter, {
  FilterOption,
} from '../../../../src/components/candidate/dashboard/notifications/NotificationFilter';
import NotificationItem, {
  Notification,
} from '../../../../src/components/candidate/dashboard/notifications/NotificationItem';
import StyledCheckbox from '../../../../src/components/company/dashboard/postjob/StyledCheckbox';

const initialNotifications: Notification[] = [
  {
    id: '1',
    title:
      'Prime Works Ltd has started following your profile. Visit their page to see their latest job postings and company updates just now.',
    tag: 'Message',
    time: '22:14 AM',
    read: false,
    starred: true
  },
  {
    id: '2',
    title: 'Your resume has been successfully submitted for Tech Nova Inc.check out your dashboard for real time status updates...',
    tag: 'Apply Result',
    time: '22:14 AM',
    read: false
  },
  {
    id: '3',
    title: 'Your profile is almost complete! Add a few more details to increase your visibility to employers and get personalized job suggestions.',
    tag: 'Message',
    time: '22:14 AM',
    read: true
  },
  {
    id: '4',
    title: 'Your resume has been successfully submitted for the ‘Product Design’ position at Global Crop Solution. We’ll keep you updated on the next steps.',
    tag: 'Apply Result',
    time: '22:14 AM',
    read: true
  },
  {
    id: '5',
    title: `Google's service, offered free of charge, instantly translates words, phrases, and web pages between English and over 100 other languages.`,
    tag: 'Message',
    time: '22:14 AM',
    read: true
  },
  {
    id: '6',
    title: 'Exciting opportunity! A ‘Digital Marketing Specialist’ role has just been posted at Bright Solutions Group. Check your dashboard for more  information and apply now.',
    tag: 'New Job',
    time: '22:14 AM',
    read: false,
    starred: true
  },
];

type FilterValue = 'All' | Notification['tag'];

const filters: FilterOption<FilterValue>[] = [
  { label: 'All', value: 'All' },
  { label: 'New Job', value: 'New Job' },
  { label: 'Messages', value: 'Message' },
  { label: 'Apply Result', value: 'Apply Result' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<FilterValue>('All');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = notifications.filter((n) =>
    filter === 'All' ? true : n.tag === filter
  );

  const allSelected =
    filtered.length > 0 && filtered.every((n) => selected.includes(n.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !filtered.some((n) => n.id === id)));
    } else {
      const idsToAdd = filtered.map((n) => n.id);
      setSelected((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleStar = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, starred: !n.starred } : n
      )
    );
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: !n.read } : n
      )
    );
  };

  return (
    <section className="max-w-6xl py-6 bg-white rounded-xl">
      <div className="flex items-center justify-between mb-6 px-2 sm:px-4">
        <div className="flex gap-2 sm:gap-4 font-medium text-sm sm:text-lg items-center">
          <div><Bell className="w-5 h-5 sm:w-6 sm:h-6" /></div> <div>You have <span className="text-[#005DDC]">{notifications.length} notifications</span> today.</div>
        </div>
        <div>
          <Ellipsis className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      {/* Select All + Filters */}
      <div className="flex gap-2 sm:gap-4 mb-6 px-2 sm:px-4">
        <StyledCheckbox
          label=""
          checked={allSelected}
          onChange={toggleSelectAll}
        />
        <NotificationFilter
          activeFilter={filter}
          onChange={setFilter}
          filters={filters}
        />
      </div>

      {/* Notifications or Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A5A5A5]">
          <Inbox className="mb-4 w-12 h-12" />
          <p className="text-lg">
            There are no notification in your inbox.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((item) => (
            <NotificationItem
              key={item.id}
              {...item}
              selected={selected.includes(item.id)}
              onToggle={() => toggleSelect(item.id)}
              onStarToggle={() => toggleStar(item.id)}
              onReadToggle={() => toggleRead(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}