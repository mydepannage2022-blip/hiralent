'use client';

import React, { useState } from 'react';

const tabList = ['Most popular', 'Most viewed', 'Top-rated', 'Most Successful'];

const Tabs = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="w-full">
            {/* Tab Buttons */}
            <div className="flex space-x-4 justify-center">
                {tabList.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        className={`py-1.5 px-4 font-medium transition duration-200 cursor-pointer rounded-lg ${activeTab === index
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
}

export default Tabs;