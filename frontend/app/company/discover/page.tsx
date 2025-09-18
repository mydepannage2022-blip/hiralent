'use client';

import React, { useState } from 'react';
import CompanySearch from '../../../src/components/company/discover/CompanySearch';
import { locationOptions } from "../../../src/constants/groupedLocationOptions";
import Tabs from "../../../src/components/company/discover/Tabs";
import Sidebar from '../../../src/components/company/discover/Sidebar';
import OffCanvasSidebar from '../../../src/components/company/discover/OffCanvasSidebar';
import { Filter } from "lucide-react";
import CompanyCard from '../../../src/components/company/discover/CompanyCard';
import Pagination from "../../../src/components/company/discover/Pagination";

const DiscoverPage = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleSearch = (title: string, location: any) => {
        console.log("Searching for:", title, location?.value);
    };

    const customStyles = {
        control: (base: any) => ({
            ...base,
            padding: "0px 8px", // Adjusted to py-2 equivalent (8px vertical), px-2 (8px horizontal)
            borderRadius: "8px",
            borderColor: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
            fontSize: "14px", // Slightly smaller font for slim look
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
            color: "#111",
            padding: "8px", // Slimmer options
            fontWeight: state.isSelected ? "bold" : "normal",
        }),
    };

    return (
        <div className='text-black'>
            <div className="sm:mt-40 mt-30 mb-20 px-2">
                <div className='flex justify-center items-center flex-col mb-14'>
                    <h1 className="xl:mb-8 mb-6 text-xl sm:text-3xl lg:text-4xl font-bold">
                        Discover the Best Workplaces
                    </h1>
                    <div className='md:max-w-xl lg:max-w-2xl w-full flex justify-between items-center gap-8 lg:gap-0 mb-6'>
                        <CompanySearch
                            locationOptions={locationOptions}
                            onSearch={handleSearch}
                            customStyles={customStyles}
                        />
                    </div>
                    <div className='flex items-center space-x-3 sm:mx-0 mx-2'>
                        {/* Mobile toggle button */}
                        <button
                            className="border border-[#CBCBCB] text-[#515151] py-1.5 px-2 font-medium cursor-pointer rounded-lg lg:hidden hover:border-[#005DDC] hover:bg-[#005DDC] hover:text-white transition-colors duration-200"

                            onClick={() => setSidebarOpen(true)}
                        >
                            <Filter size={20} />
                        </button>
                        <Tabs />
                    </div>
                </div>

                <div className='flex justify-center gap-4'>
                    {/* Sidebar */}
                    <div className="hidden lg:block">
                        <Sidebar />
                    </div>

                    {/* OffCanvasSidebar */}
                    <OffCanvasSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />

                    <div className='flex flex-col gap-4 sm:mx-10 md:mx-13 lg:mx-0 mx-2 lg:w-[720px] xl:w-[975px] w-full'>
                        <CompanyCard
                            logo="/images/bmw-logo.png"
                            name="BMW"
                            location="Los Angeles"
                            rating={4.5}
                            badges={[
                                { label: 'Global', type: 'blue' },
                                { label: 'Hiring', type: 'green' },
                            ]}
                            description="Sandro is a French fashion brand known for its chic, contemporary collections, offering men."
                            jobs="50"
                            reviews="103.98K"
                            salaries="88.1K"
                        />
                        <CompanyCard
                            logo="/images/belle-logo.png"
                            name="Belle"
                            location="Canada"
                            rating={4.5}
                            badges={[
                                { label: 'Global', type: 'blue' },
                                { label: 'Hiring', type: 'green' },
                            ]}
                            description="Sandro is a French fashion brand known for its chic, contemporary collections, offering men."
                            jobs="50"
                            reviews="103.98K"
                            salaries="88.1K"
                        />
                        <CompanyCard
                            logo="/images/diminospizza-logo.png"
                            name="Domino's Pizza"
                            location="China"
                            rating={4.5}
                            badges={[
                                { label: 'Global', type: 'blue' },
                                { label: 'Hiring', type: 'green' },
                            ]}
                            description="Sandro is a French fashion brand known for its chic, contemporary collections, offering men."
                            jobs="50"
                            reviews="103.98K"
                            salaries="88.1K"
                        />
                        <CompanyCard
                            logo="/images/p&g-logo.png"
                            name="P & G"
                            location="Brazil"
                            rating={4.5}
                            badges={[
                                { label: 'Global', type: 'blue' },
                                { label: 'Hiring', type: 'green' },
                            ]}
                            description="Sandro is a French fashion brand known for its chic, contemporary collections, offering men."
                            jobs="50"
                            reviews="103.98K"
                            salaries="88.1K"
                        />

                        <Pagination totalPages={10} currentPage={1} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoverPage;