'use client';

import React from 'react';
import Image from 'next/image';
import { Star, ChevronRight } from 'lucide-react';
import SmartLink from '../../layout/SmartLink';

interface CompanyCardProps {
    logo: string;
    name: string;
    location: string;
    rating: number;
    badges: { label: string; type: 'blue' | 'green' }[];
    description: string;
    jobs: string;
    reviews: string;
    salaries: string;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
    logo,
    name,
    location,
    rating,
    badges,
    description,
    jobs,
    reviews,
    salaries,
}) => {
    return (
        <div className="flex items-start justify-between border border-[#EDEDED] rounded-lg py-3 px-4 bg-white w-full">
            {/* Left section */}
            <div className="flex items-start gap-2 flex-1">
                {/* Logo */}
                <div className="flex-shrink-0">
                    <Image
                        src={logo}
                        alt={name}
                        width={70}
                        height={70}
                        className="rounded-xl object-contain border border-[#CBCBCB]"
                    />
                </div>

                {/* Main content */}
                <div className="flex flex-col flex-1 mt-2">
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-black">{name}</h3>
                            <p className="text-sm text-[#757575]">{location}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star size={16} className="text-[#F6B500] fill-[#F6B500]" />
                            <span className="text-sm font-medium text-[#515151]">
                                {rating.toFixed(1)}
                            </span>
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mt-2">
                        {badges.map((badge, idx) => (
                            <span
                                key={idx}
                                className={`px-2 py-0.5 text-xs font-medium rounded-sm border ${badge.type === 'blue'
                                    ? 'text-[#005DDC] border-[#005DDC]'
                                    : 'text-green-600 border-[#009E00]'
                                    }`}
                            >
                                {badge.label}
                            </span>
                        ))}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#282828] mt-2 line-clamp-2">{description}</p>

                    {/* Bottom stats */}
                    <div className="flex items-center justify-between mt-6 text-sm text-[#515151]">
                        <div className="flex items-center gap-6">
                            <span>{jobs} Jobs</span>
                            <span>{reviews} Reviews</span>
                            <span>{salaries} Salaries</span>
                        </div>
                        <SmartLink href="/company/public-profile">
                            <ChevronRight
                                size={20}
                                className="text-[#515151] hover:text-black cursor-pointer"
                            />
                        </SmartLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyCard;