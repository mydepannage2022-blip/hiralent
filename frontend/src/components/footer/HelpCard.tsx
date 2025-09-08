"use client";

import { ReactNode } from "react";

type HelpCardProps = {
    icon: ReactNode;
    title: string;
    description: string;
};

const HelpCard = ({ icon, title, description }: HelpCardProps) => {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="mb-3 text-blue-600">{icon}</div>
            <h3 className="mb-2 text-base font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    );
};

export default HelpCard;