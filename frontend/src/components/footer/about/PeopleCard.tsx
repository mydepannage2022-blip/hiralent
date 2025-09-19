'use client';

import React from "react";
import Image from 'next/image';

export type SocialType = 'linkedin' | 'instagram' | 'dribbble';

export interface SocialLink {
    type: SocialType;
    href: string;
}

interface PeopleCardProps {
    image: string;
    name: string;
    role: string;
    socials?: SocialLink[];
}

const ICON_PATHS: Record<SocialType, string> = {
    linkedin: '/images/linkedinIcon.svg',   // white icon inside square bg
    dribbble: '/images/dribbbleIcon.svg',   // pink fill with gray lines
    instagram: '/images/instagramIcon.svg', // gradient fill baked in
};

const PeopleCard = ({
    image,
    name,
    role,
    socials = []
}: PeopleCardProps) => {
    return (
        <article className="relative text-center bg-white rounded-lg border border-[#EDEDED] pt-11 pb-3">
            {/* Floating Avatar */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <div className="h-[74px] w-[74px] relative rounded-full border-1 border-white overflow-hidden">
                    <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover"
                        sizes="74px"
                    />
                </div>
            </div>

            {/* Name & Role */}
            <h4 className="font-semibold">{name}</h4>
            <p className="text-xs text-[#515151]">{role}</p>

            {/* Social Icons */}
            <div className="flex justify-center gap-1 mt-3">
                {socials.map((s, i) => (
                    <a
                        key={i}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${name} ${s.type}`}
                        className="flex items-center justify-center w-8 h-8"
                    >
                        <Image
                            src={ICON_PATHS[s.type]}
                            alt={`${s.type} icon`}
                            width={20}
                            height={20}
                        />
                    </a>
                ))}
            </div>
        </article>
    );
}

export default PeopleCard;