'use client';

import React, { useState } from 'react';

const tabList = ['Most popular', 'Most viewed', 'Top-rated', 'Most Successful'];

const Tabs = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="w-full">
            {/* Tab Buttons */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-4">
                {tabList.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        className={`w-[calc(50%-0.25rem)] sm:w-auto text-xs sm:text-base text-center lg:py-2 lg:px-6 py-1 px-3 font-medium transition duration-200 cursor-pointer rounded-lg ${activeTab === index
                                ? 'bg-[#005DDC] text-white'
                                : 'border border-[#CBCBCB] text-[#515151]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Tabs;