"use client";

import React, { useMemo, useState } from "react";
import { Bell, Ellipsis, Inbox } from "lucide-react";

import StyledCheckbox from "@/src/components/company/dashboard/postjob/StyledCheckbox";

import NotificationFilter, {
  FilterOption,
} from "@/src/components/candidate/dashboard/notifications/NotificationFilter";
import NotificationItem, {
  Notification,
} from "@/src/components/candidate/dashboard/notifications/NotificationItem";

import {
  useNotifications,
  useMarkNotificationRead,
} from "@/src/lib/notifications/notifications.queries";
import {
  buildTitle,
  candidateTagFromType,
  formatTime,
  CandidateNotificationTag,
} from "@/src/lib/notifications/notifications.ui";

type FilterValue = "All" | CandidateNotificationTag;

const filters: FilterOption<FilterValue>[] = [
  { label: "All", value: "All" },
  { label: "New Job", value: "New Job" },
  { label: "Messages", value: "Message" },
  { label: "Apply Result", value: "Apply Result" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterValue>("All");
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading, error } = useNotifications("CANDIDATE", { limit: 100 });
  const markRead = useMarkNotificationRead("CANDIDATE");

  const mapped: Notification[] = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((n) => ({
      id: n.notification_id,
      title: buildTitle(n),
      tag: candidateTagFromType(n.type),
      time: formatTime(n.created_at),
      read: !!n.read_at,
      starred: !!n.starred_at, // affichage seulement (pas de toggle)
    }));
  }, [data]);

  const filtered = mapped.filter((n) => (filter === "All" ? true : n.tag === filter));
  const allSelected = filtered.length > 0 && filtered.every((n) => selected.includes(n.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !filtered.some((n) => n.id === id)));
    } else {
      const idsToAdd = filtered.map((n) => n.id);
      setSelected((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const onRead = async (id: string) => {
    await markRead.mutateAsync({ notificationId: id });
  };

  const count = mapped.length;

  return (
    <section className="max-w-6xl py-6 bg-white rounded-xl">
      <div className="flex items-center justify-between mb-6 px-2 sm:px-4">
        <div className="flex gap-2 sm:gap-4 font-medium text-sm sm:text-lg items-center">
          <div>
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            You have <span className="text-[#005DDC]">{count} notifications</span> today.
          </div>
        </div>
        <div>
          <Ellipsis className="w-5 h-5 cursor-pointer" />
        </div>
      </div>

      <div className="flex gap-2 sm:gap-4 mb-6 px-2 sm:px-4">
        <StyledCheckbox label="" checked={allSelected} onChange={toggleSelectAll} />
        <NotificationFilter activeFilter={filter} onChange={setFilter} filters={filters} />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="py-16 text-center text-red-600">Failed to load notifications.</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A5A5A5]">
          <Inbox className="mb-4 w-12 h-12" />
          <p className="text-lg">There are no notification in your inbox.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((item) => (
            <NotificationItem
              key={item.id}
              {...item}
              selected={selected.includes(item.id)}
              onToggle={() => toggleSelect(item.id)}
              // backend doesn't support star toggling => keep UI behavior simple
              onStarToggle={() => {}}
              onReadToggle={() => onRead(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
