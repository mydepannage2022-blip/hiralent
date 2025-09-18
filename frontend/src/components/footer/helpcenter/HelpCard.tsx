"use client";

import Image from "next/image";

type HelpCardProps = {
    icon: string; // now just a string path
    title: string;
    description: string;
};

const HelpCard = ({ icon, title, description }: HelpCardProps) => {
    return (
        <div className="rounded-lg border border-[#EDEDED] bg-white p-4 flex flex-col items-start">
            <Image src={icon} alt={title} width={40} height={40} className="mb-3" />
            <h3 className="mb-2 text-base xl:text-xl font-semibold text-gray-800">{title}</h3>
            <p className="text-[#515151]">{description}</p>
        </div>
    );
};

export default HelpCard;