// src/components/company/dashboard/settings/SectionCard1.tsx
"use client";

import React, { ReactNode } from "react";
import { SquarePen } from "lucide-react";

interface Props {
    title: string;
    icon?: ReactNode;
    isEditing: boolean;
    onEditClick: () => void;
    children: ReactNode;
}

const SectionCard1: React.FC<Props> = ({ title, icon, isEditing, onEditClick, children }) => {
    return (
        <div className="bg-white rounded-lg p-2.5 sm:p-5 border border-[#EDEDED] w-full box-border">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 min-w-0">
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
                </div>

                {/* Pencil only visible in read-only (isEditing === false) */}
                {!isEditing && (
                    <button onClick={onEditClick} aria-label={`Edit ${title}`} className="flex-shrink-0">
                        <SquarePen className="w-5 h-5 text-[#005DDC] cursor-pointer" />
                    </button>
                )}
            </div>

            <div className="min-w-0">{children}</div>
        </div>
    );
};

export default SectionCard1;