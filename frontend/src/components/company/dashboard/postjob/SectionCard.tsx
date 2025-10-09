import React from "react";

interface SectionCardProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const SectionCard = ({ title, icon, children }: SectionCardProps) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            {icon} {title}
        </h2>
        {children}
    </div>
);

export default SectionCard;