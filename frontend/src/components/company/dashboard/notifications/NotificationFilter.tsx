'use client';
import React from 'react';

export type FilterOption<T extends string> = {
    label: string;
    value: T;
    count?: number;
};

interface NotificationFilterProps<T extends string> {
    activeFilter: T;
    onChange: (filter: T) => void;
    filters: FilterOption<T>[];
}

export default function NotificationFilter<T extends string>({
    activeFilter,
    onChange,
    filters,
}: NotificationFilterProps<T>) {
    return (
        <div className="flex gap-2 sm:gap-4 flex-wrap">
            {filters.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`cursor-pointer px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-sm border transition ${activeFilter === opt.value
                            ? 'bg-[#005DDC] text-white border-[#005DDC]'
                            : 'bg-white text-[#515151] border-[#CBCBCB] hover:bg-gray-100'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}