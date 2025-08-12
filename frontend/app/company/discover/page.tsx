'use client';

import React, { useState } from 'react';
import Navbar from '../../src/components/layout/Navbar'
import CompanySearch from '../../src/components/company/discover/CompanySearch'
import { locationOptions } from "../../src/constants/groupedLocationOptions"
import Tabs from "../../src/components/company/discover/Tabs"
import Sidebar from '@/app/src/components/company/discover/Sidebar';
import OffCanvasSidebar from '../../src/components/company/discover/OffCanvasSidebar';
import CompanyCard from '@/app/src/components/company/discover/CompanyCard';
import Pagination from "../../src/components/company/discover/Pagination"
import Footer from '../../src/components/layout/Footer'

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
            <Navbar />
            <div className="mt-35 mb-20">
                <div className='flex justify-center items-center flex-col mb-14'>
                    <h1 className='mb-8 text-3xl font-bold'>Discover the Best Workplaces</h1>
                    <div className='lg:max-w-5xl xl:max-w-3xl w-full flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-0 mb-6'>
                        <CompanySearch
                            locationOptions={locationOptions}
                            onSearch={handleSearch}
                            customStyles={customStyles}
                        />
                    </div>
                    <Tabs />
                </div>

                <div className='flex justify-center gap-4'>
                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block">
                        <Sidebar />
                    </div>

                    {/* Mobile toggle button */}
                    <button
                        className="p-2 bg-blue-500 text-white rounded-lg lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        Open Filters
                    </button>

                    {/* Sidebar */}
                    <OffCanvasSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />

                    <div className='flex flex-col gap-4'>
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
            <Footer />
        </div>
    );
};

export default DiscoverPage;