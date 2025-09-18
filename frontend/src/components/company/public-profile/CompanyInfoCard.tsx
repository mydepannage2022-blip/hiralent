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

const CompanyInfoCard = ({
    logo,
    name,
    website,
    websiteUrl,
    location,
    companySize,
    email,
    phone,
}: Props) => {
    return (
        <div className="w-full max-w-[475px] sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] mx-auto bg-white border border-[#EDEDED] rounded-lg overflow-hidden p-6 lg:py-6 lg:px-8">
            {/* Top container: logo + right content */}
            <div className="flex items-start gap-3 sm:gap-5">
                {/* Left container (logo) */}
                <div className="flex-shrink-0 flex items-center justify-center px-2 sm:px-4 md:p-2 lg:py-4 lg:px-6">
                    <Image
                        src={logo}
                        alt={`${name} logo`}
                        width={150}
                        height={150}
                        className="rounded-full object-contain w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] lg:w-[150px] lg:h-[150px]"
                    />
                </div>

                {/* Right container */}
                <div className="flex-1 flex flex-col gap-5">
                    {/* Top row: company name + buttons */}
                    <div className="flex sm:flex-row flex-col justify-between items-start gap-2 lg:p-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-semibold">{name}</h1>
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
                            <button className="h-6 sm:h-8 px-4 rounded-sm sm:rounded-md bg-[#005DDC] text-white sm:text-sm text-xs hover:bg-[#004fc0] transition cursor-pointer">
                                Follow
                            </button>
                            <button
                                aria-label="Save"
                                className="h-5 w-5 sm:h-9 sm:w-9 inline-flex items-center justify-center text-[#005DDC] hover:text-[#004fc0] transition cursor-pointer"
                            >
                                <Bookmark size={24} />
                            </button>
                            <button
                                aria-label="Share"
                                className="h-5 w-5 sm:h-9 sm:w-9 inline-flex items-center justify-center text-[#005DDC] hover:text-[#004fc0] transition cursor-pointer"
                            >
                                <Share2 size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom content (only visible on sm+) */}
                    <div className="hidden sm:block">
                        <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-row sm:items-stretch sm:gap-0 lg:px-4">
                            {/* Location */}
                            <div className="sm:w-fit flex flex-col justify-center md:text-base text-sm">
                                <p className="text-[#515151]">Location</p>
                                <p className="font-semibold text-[#353535]">{location}</p>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />
                            <div className="hidden sm:block w-px bg-[#EDEDED]" />
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />

                            {/* Company size */}
                            <div className="sm:w-fit flex flex-col justify-center md:text-base text-sm">
                                <p className="text-[#515151]">Company size</p>
                                <p className="font-semibold text-[#353535]">{companySize}</p>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />
                            <div className="hidden sm:block w-px bg-[#EDEDED]" />
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />

                            {/* Email */}
                            <div className="sm:w-fit flex flex-col justify-center md:text-base text-sm">
                                <p className="text-[#515151]">Email</p>
                                <p className="font-semibold text-[#353535] truncate">{email}</p>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />
                            <div className="hidden sm:block w-px bg-[#EDEDED]" />
                            <div className="hidden sm:flex sm:w-3 md:w-7 lg:w-13" />

                            {/* Phone */}
                            <div className="sm:w-fit flex flex-col justify-center md:text-base text-sm">
                                <p className="text-[#515151]">Phone</p>
                                <p className="font-semibold text-[#353535]">{phone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom content (only visible on <sm, spans full width) */}
            <div className="block sm:hidden mt-6 w-full">
                <div className="grid grid-cols-2 gap-4 pl-4">
                    {/* Location */}
                    <div className="flex flex-col justify-center text-xs">
                        <p className="text-[#515151]">Location</p>
                        <p className="font-semibold text-[#353535]">{location}</p>
                    </div>

                    {/* Company size */}
                    <div className="flex flex-col justify-center text-xs">
                        <p className="text-[#515151]">Company size</p>
                        <p className="font-semibold text-[#353535]">{companySize}</p>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col justify-center text-xs">
                        <p className="text-[#515151]">Email</p>
                        <p className="font-semibold text-[#353535] truncate">{email}</p>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col justify-center text-xs">
                        <p className="text-[#515151]">Phone</p>
                        <p className="font-semibold text-[#353535]">{phone}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CompanyInfoCard;