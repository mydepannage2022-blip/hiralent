'use client';

import React, { useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import SmartLink from '../../layout/SmartLink';

interface CompanyCardProps {
    logo?: string | null;
    name: string;
    location?: string | null;
    rating?: number | null;
    badges?: { label: string; type: 'blue' | 'green' }[];
    description?: string | null;
    jobs?: string | number;
    reviews?: string;
    salaries?: string;
    /** Slug (or company id) used to link to the public profile. */
    slug?: string | null;
}

const initials = (name: string) =>
    (name || 'C')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'C';

const CompanyCard: React.FC<CompanyCardProps> = ({
    logo,
    name,
    location,
    rating,
    badges = [],
    description,
    jobs,
    reviews,
    salaries,
    slug,
}) => {
    const [logoError, setLogoError] = useState(false);
    const profileHref = slug ? `/company/${slug}` : '/company/discover';
    const showLogo = !!logo && !logoError;

    return (
        <div className="flex items-start justify-between border border-[#EDEDED] rounded-lg py-3 px-4 bg-white w-full">
            {/* Left section */}
            <div className="flex items-start gap-2 flex-1">
                {/* Logo */}
                <div className="flex-shrink-0">
                    {showLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logo as string}
                            alt={name}
                            width={70}
                            height={70}
                            onError={() => setLogoError(true)}
                            className="w-[70px] h-[70px] rounded-xl object-contain border border-[#CBCBCB]"
                        />
                    ) : (
                        <div className="w-[70px] h-[70px] rounded-xl border border-[#CBCBCB] bg-[#F3F6FB] flex items-center justify-center text-xl font-bold text-[#005DDC]">
                            {initials(name)}
                        </div>
                    )}
                </div>

                {/* Main content */}
                <div className="flex flex-col flex-1 mt-2">
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-black">{name}</h3>
                            {location ? (
                                <p className="text-sm text-[#757575]">{location}</p>
                            ) : null}
                        </div>
                        {rating != null ? (
                            <div className="flex items-center gap-1">
                                <Star size={16} className="text-[#F6B500] fill-[#F6B500]" />
                                <span className="text-sm font-medium text-[#515151]">
                                    {rating.toFixed(1)}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    {/* Badges */}
                    {badges.length > 0 ? (
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
                    ) : null}

                    {/* Description */}
                    {description ? (
                        <p className="text-sm text-[#282828] mt-2 line-clamp-2">{description}</p>
                    ) : null}

                    {/* Bottom stats */}
                    <div className="flex items-center justify-between mt-6 text-sm text-[#515151]">
                        <div className="flex items-center gap-6">
                            {jobs != null ? <span>{jobs} Jobs</span> : null}
                            {reviews ? <span>{reviews} Reviews</span> : null}
                            {salaries ? <span>{salaries} Salaries</span> : null}
                        </div>
                        <SmartLink href={profileHref}>
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
