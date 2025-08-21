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
        <div className="w-full max-w-[1024px] mx-auto bg-white border border-[#EDEDED] rounded-lg overflow-hidden flex p-6">
            {/* Left container — Logo */}
            <div className="flex-shrink-0 flex items-center justify-center py-4 px-8">
                <Image
                    src={logo}
                    alt={`${name} logo`}
                    width={150}
                    height={150}
                    className="rounded-full object-contain ring-1 ring-gray-200"
                />
            </div>

            {/* Right container — Content */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Top content */}
                <div className="flex flex-col md:flex-row justify-between items-start px-6 py-4 gap-4">
                    {/* Company name + website */}
                    <div>
                        <h1 className="text-3xl font-semibold">{name}</h1>
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
                        <button className="h-8 px-4 rounded-lg bg-[#005DDC] text-white text-sm font-medium hover:bg-[#004fc0] transition cursor-pointer">
                            Follow
                        </button>
                        <button
                            aria-label="Save"
                            className="h-9 w-9 inline-flex items-center justify-center text-[#005DDC] hover:text-[#004fc0] transition cursor-pointer"
                        >
                            <Bookmark size={24} />
                        </button>
                        <button
                            aria-label="Share"
                            className="h-9 w-9 inline-flex items-center justify-center text-[#005DDC] hover:text-[#004fc0] transition cursor-pointer"
                        >
                            <Share2 size={24} />
                        </button>
                    </div>
                </div>

                {/* Bottom content — pixel-perfect gaps + full-height dividers without edge boldness */}
                <div className="px-6">
                    <div className="flex items-stretch">
                        {/* Location */}
                        <div className="w-fit flex flex-col justify-center">
                            <p className="text-[#515151]">Location</p>
                            <p className="font-semibold text-[#353535]">{location}</p>
                        </div>

                        {/* gap + divider + gap */}
                        <div className="w-12.5" />
                        <div className="w-px bg-[#EDEDED]" />
                        <div className="w-12.5" />

                        {/* Company size */}
                        <div className="w-fit flex flex-col justify-center">
                            <p className="text-[#515151]">Company size</p>
                            <p className="font-semibold text-[#353535]">{companySize}</p>
                        </div>

                        {/* gap + divider + gap */}
                        <div className="w-12.5" />
                        <div className="w-px bg-[#EDEDED]" />
                        <div className="w-12.5" />

                        {/* Email */}
                        <div className="w-fit flex flex-col justify-center">
                            <p className="text-[#515151]">Email</p>
                            <p className="font-semibold text-[#353535] truncate">{email}</p>
                        </div>

                        {/* gap + divider + gap */}
                        <div className="w-12.5" />
                        <div className="w-px bg-[#EDEDED]" />
                        <div className="w-13" />

                        {/* Phone */}
                        <div className="w-fit flex flex-col justify-center">
                            <p className="text-[#515151]">Phone</p>
                            <p className="font-semibold text-[#353535]">{phone}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}