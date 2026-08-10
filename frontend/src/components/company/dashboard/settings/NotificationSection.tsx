"use client";

import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import SectionCard2 from "./SectionCard2";
import Toggle from "./Toggle";
import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@/src/lib/notifications/preferences.api";

const defaultPrefs = {
    newapplicant: true,
    meetingbooked: true,
    messages: false,
};

const NotificationSection: React.FC = () => {
    const [toggles, setToggles] = useState(defaultPrefs);

    // Load persisted preferences from the server on mount (merge over defaults).
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const prefs = await getNotificationPreferences("COMPANY");
                if (!active) return;
                setToggles((prev) => {
                    const next = { ...prev };
                    (Object.keys(prev) as (keyof typeof prev)[]).forEach((key) => {
                        if (typeof prefs[key] === "boolean") next[key] = prefs[key];
                    });
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

    // Optimistic update, then persist the full map to the server.
    const handleToggle = (key: keyof typeof toggles) => {
        const updated = { ...toggles, [key]: !toggles[key] };
        setToggles(updated);
        updateNotificationPreferences(updated, "COMPANY").catch(() => {
            // Revert the optimistic flip if the save fails.
            setToggles((prev) => ({ ...prev, [key]: !updated[key] }));
        });
    };

    const items = [
        {
            label: "New Applicant",
            key: "newapplicant",
            description: "Get notified when new applicant applied.",
        },
        {
            label: "Meeting Booked",
            key: "meetingbooked",
            description: "Receive alerts when meeting is booked on calendar.",
        },
        {
            label: "Messages",
            key: "messages",
            description: "Get notified when a company or candidate sends you a message.",
        },
    ] as const;

    return (
        <SectionCard2 title="Notifications" icon={<Bell className="w-5 h-5" />}>
            <div className="space-y-6">
                {items.map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between hover:bg-gray-50 rounded-lg transition"
                    >
                        <div className="max-w-[80%]">
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-[#757575]">{item.description}</p>
                        </div>
                        <Toggle
                            enabled={toggles[item.key]}
                            onToggle={() => handleToggle(item.key)}
                        />
                    </div>
                ))}
            </div>
        </SectionCard2>
    );
};

export default NotificationSection;