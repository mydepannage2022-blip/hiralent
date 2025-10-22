// src/components/company/dashboard/settings/Toggle.tsx
"use client";

import React from "react";

interface ToggleProps {
    enabled: boolean;
    onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enabled ? "bg-blue-600" : "bg-gray-400"
                }`}
            aria-pressed={enabled}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"
                    }`}
            />
        </button>
    );
};

export default Toggle;