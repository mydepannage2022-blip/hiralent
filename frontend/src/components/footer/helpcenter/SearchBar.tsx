"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const tabs = ["General", "Pricing", "Dashboard", "Login & Sign up", "Find job", "Post job"];

const SearchBar = () => {
    const [activeTab, setActiveTab] = useState("General"); // default active tab

    return (
        <div className="text-center">
            <div className="flex flex-col justify-center items-center">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold w-full max-w-sm sm:max-w-md lg:max-w-lg text-center">
                    How can Hiralent help you?
                </h1>
                <p className="text-lg text-[#515151] mt-4 font-medium">We are here to help</p>
            </div>

            {/* Search input with icon */}
            <div className="mt-7 flex justify-center">
                <div className="relative w-full max-w-[605px]">
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full border rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#005DDC] text-lg"
                    />
                    <Search
                        size={20}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-md px-4 py-1.5 text-sm transition font-medium
                            ${activeTab === tab
                                ? "bg-[#005DDC] text-white"
                                : "text-[#515151] hover:bg-[#005DDC] border border-[#A5A5A5]"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SearchBar;