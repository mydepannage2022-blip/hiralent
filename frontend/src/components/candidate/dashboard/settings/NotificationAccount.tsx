import React, { useState } from "react";
import { Bell } from "lucide-react";

// Reusable Toggle Component
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? "bg-blue-600" : "bg-gray-400"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotificationAccount() {
  // Notifications config (easy to extend)
  const notificationOptions = [
    {
      key: "job",
      title: "New Job",
      description: "Notify me when a new job is posted.",
    },
    {
      key: "result",
      title: "Application Result",
      description: "Notify me when an employer rejected me.",
    },
    {
      key: "message",
      title: "Messages",
      description: "Notify me when I get a new message.",
    },
  ] as const;

  type NotificationKey = typeof notificationOptions[number]["key"];

  // Manage toggles in one state object
  const [toggles, setToggles] = useState<Record<NotificationKey, boolean>>({
    job: true,
    result: true,
    message: false,
  });

  // Toggle handler
  const handleToggle = (key: NotificationKey) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="border border-gray-300 p-5 rounded-xl ">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <Bell className="text-gray-700" />
          <span className="text-lg font-bold ml-2">Notifications</span>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        {notificationOptions.map(({ key, title, description }) => (
          <div
            key={key}
            className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">{title}</span>
              <span className="text-gray-500 text-sm">{description}</span>
            </div>
            <Toggle enabled={toggles[key]} onToggle={() => handleToggle(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationAccount;
