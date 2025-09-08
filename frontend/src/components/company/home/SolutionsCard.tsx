'use client';

import React from 'react';

interface SolutionsCardProps {
    image: string;
    title: string;
    description: string;
}

const SolutionsCard = ({ image, title, description }: SolutionsCardProps) => {
    return (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border border-[#EDEDED] p-6 max-w-xs mx-auto transition">
            {/* Image */}
            <img src={image} alt={title} className="w-16 h-16 object-contain mb-4" />

            {/* Title */}
            <h3 className="text-2xl font-bold mb-2">{title}</h3>

            {/* Description */}
            <p className="text-gray-600 text-sm">{description}</p>
        </div>
    );
};

export default SolutionsCard;