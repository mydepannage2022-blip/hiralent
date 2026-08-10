"use client";
import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/src/lib/notifications/preferences.api";

// Reusable Toggle Component
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? "bg-[#005DDC]" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const notificationOptions = [
  {
    key: "new_job",
    title: "New Job Alerts",
    description: "Get notified when jobs matching your profile are posted.",
  },
  {
    key: "application_update",
    title: "Application Updates",
    description: "Get notified when your application status changes.",
  },
  {
    key: "messages",
    title: "Messages",
    description: "Get notified when you receive a new message.",
  },
  {
    key: "profile_views",
    title: "Profile Views",
    description: "Get notified when an employer views your profile.",
  },
] as const;

type NotificationKey = typeof notificationOptions[number]["key"];

const defaultPrefs: Record<NotificationKey, boolean> = {
  new_job: true,
  application_update: true,
  messages: true,
  profile_views: false,
};

function NotificationAccount() {
  const [toggles, setToggles] = useState<Record<NotificationKey, boolean>>(defaultPrefs);
  const [saved, setSaved] = useState(false);

  // Load persisted preferences from the server on mount (merge over defaults).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getNotificationPreferences("CANDIDATE");
        if (!active) return;
        setToggles((prev) => {
          const next = { ...prev };
          for (const { key } of notificationOptions) {
            if (typeof prefs[key] === "boolean") next[key] = prefs[key];
          }
          return next;
        });
      } catch {
        // Non-fatal: fall back to defaults if prefs can't be loaded.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Toggle handler — optimistic update, then persist the full map to the server.
  const handleToggle = (key: NotificationKey) => {
    const updated = { ...toggles, [key]: !toggles[key] };
    setToggles(updated);
    updateNotificationPreferences(updated, "CANDIDATE")
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => {
        // Revert the optimistic flip if the save fails.
        setToggles((prev) => ({ ...prev, [key]: !updated[key] }));
      });
  };

  return (
    <div className="border border-gray-200 p-5 rounded-xl mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bell size={18} className="text-[#005DDC]" />
          </div>
          <span className="font-semibold text-gray-800">Notifications</span>
        </div>
        {saved && (
          <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium animate-pulse">
            Saved!
          </span>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-1">
        {notificationOptions.map(({ key, title, description }) => (
          <div
            key={key}
            className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{title}</span>
              <span className="text-gray-500 text-xs mt-0.5">{description}</span>
            </div>
            <Toggle enabled={toggles[key]} onToggle={() => handleToggle(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationAccount;
