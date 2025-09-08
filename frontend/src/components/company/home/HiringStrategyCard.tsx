import React from "react";

interface HiringStrategyCardProps {
    title: string;
    description: string;
    buttonText?: string; // optional
}

const HiringStrategyCard: React.FC<HiringStrategyCardProps> = ({ title, description, buttonText }) => {
    return (
        <div className="bg-[#F9F9F9] rounded-2xl p-5 xl:p-6 flex flex-col justify-between h-full">
            <div>
                <h3 className="text-xl font-semibold my-4 text-left">{title}</h3>
                <p className="xl:text-lg text-gray-600 text-left">{description}</p>
            </div>

            {buttonText && (
                <div className="mt-12 mb-6">
                    <button className="w-full py-2 rounded-lg bg-[#222222] text-white font-medium hover:bg-[#333333] text-center cursor-pointer">
                        {buttonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HiringStrategyCard;