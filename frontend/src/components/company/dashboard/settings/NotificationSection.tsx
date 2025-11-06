"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import SectionCard2 from "./SectionCard2";
import Toggle from "./Toggle";

const NotificationSection: React.FC = () => {
    const [toggles, setToggles] = useState({
        newapplicant: true,
        meetingbooked: true,
        messages: false,
    });

    const handleToggle = (key: keyof typeof toggles) => {
        setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
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