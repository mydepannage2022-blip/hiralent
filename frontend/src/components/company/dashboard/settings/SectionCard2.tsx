// src/components/company/dashboard/settings/SectionCard2.tsx
"use client";

import React, { ReactNode } from "react";

interface Props {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
}

const SectionCard2: React.FC<Props> = ({ title, icon, children }) => {
    return (
        <div className="bg-white rounded-lg p-2.5 sm:p-5 border border-[#EDEDED] w-full box-border">
            <div className="flex items-center gap-2 mb-6">
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
            </div>

            <div>{children}</div>
        </div>
    );
};

export default SectionCard2;