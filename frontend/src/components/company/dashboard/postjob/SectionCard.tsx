"use client";

import { ReactNode } from "react";
import { SquarePen } from "lucide-react";

interface SectionCardProps {
    title: string;
    icon?: ReactNode; // optional icon
    children: ReactNode;
    isEditing: boolean;
    onToggle: () => void;
}

const SectionCard = ({ title, icon, children, isEditing, onToggle }: SectionCardProps) => {
    return (
        <div className="bg-white rounded-lg p-2.5 sm:p-5 border border-[#EDEDED]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    {icon && <span>{icon}</span>}
                    <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
                </div>

                {/* Action button */}
                {isEditing ? (
                    <button
                        onClick={onToggle}
                        className="bg-[#3E8FFF] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#3375d6] transition-colors"
                    >
                        Save
                    </button>
                ) : (
                    <button onClick={onToggle}>
                        <SquarePen className="w-5 h-5 text-[#3E8FFF] cursor-pointer" />
                    </button>
                )}
            </div>

            {/* Content */}
            {children}
        </div>
    );
};

export default SectionCard;