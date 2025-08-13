'use client';

import Image from 'next/image';
import { Link as LinkIcon, Share2, Bookmark } from 'lucide-react';

type Props = {
    logo: string;
    name: string;
    website: string;
    websiteUrl?: string;
    location: string;
    companySize: string | number;
    email: string;
    phone: string;
};

export default function CompanyInfoCard({
    logo,
    name,
    website,
    websiteUrl,
    location,
    companySize,
    email,
    phone,
}: Props) {
    return (
        <div className="w-full max-w-[1000px] mx-auto bg-white border border-[#EDEDED] rounded-lg shadow-[0_6px_24px_rgba(0,0,0,0.08)] overflow-hidden flex p-4">
            {/* Left container — Logo */}
            <div className="flex-shrink-0 flex items-center justify-center p-6">
                <Image
                    src={logo}
                    alt={`${name} logo`}
                    width={120}
                    height={120}
                    className="rounded-full object-contain ring-1 ring-gray-200"
                />
            </div>

            {/* Right container — Content */}
            <div className="flex-1 flex flex-col">
                {/* Top content */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 pt-6 pb-4 gap-4">
                    {/* Company name + website */}
                    <div>
                        <h2 className="text-xl font-semibold">{name}</h2>
                        <a
                            href={websiteUrl ?? `https://${website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[#005DDC] text-sm hover:underline"
                        >
                            <LinkIcon size={16} />
                            <span>{website}</span>
                        </a>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                        <button className="h-9 px-4 rounded-md bg-[#005DDC] text-white text-sm font-medium hover:bg-[#004fc0] transition">
                            Follow
                        </button>
                        <button
                            aria-label="Share"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[#EDEDED] text-gray-600 hover:bg-gray-50 transition"
                        >
                            <Share2 size={18} />
                        </button>
                        <button
                            aria-label="Save"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[#EDEDED] text-gray-600 hover:bg-gray-50 transition"
                        >
                            <Bookmark size={18} />
                        </button>
                    </div>
                </div>

                {/* Bottom content */}
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    <div className="px-6 py-3">
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="font-medium">{location}</p>
                    </div>
                    <div className="px-6 py-3">
                        <p className="text-xs text-gray-500">Company size</p>
                        <p className="font-medium">{companySize}</p>
                    </div>
                    <div className="px-6 py-3">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium truncate">{email}</p>
                    </div>
                    <div className="px-6 py-3">
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{phone}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}