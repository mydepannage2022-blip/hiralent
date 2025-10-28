import React from "react";

interface CompanyLogoProps {
    src: string;
    alt?: string;
    size?: string; // Tailwind width/height classes
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({
    src,
    alt = "Company Logo",
    size = "w-32 h-8",
}) => {
    return (
        <div
            className={`flex items-center justify-center ${size} rounded-full bg-[#F9F9F9] overflow-hidden px-4 xl:px-8`}
        >
            <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
    );
};

export default CompanyLogo;