'use client'

import React, { useState } from 'react';
import CompanySearch from '../../../src/components/company/discover/CompanySearch';
import { locationOptions } from "../../../src/constants/groupedLocationOptions";
import JsSidebar from '../../../src/components/job/jobsearch/JsSidebar';
import OffCanvasSidebarJs from '../../../src/components/job/jobsearch/OffCanvasSidebarJs';
import { Filter } from "lucide-react";
import JsJobCard from '../../../src/components/job/jobsearch/JsJobCard';
import Pagination from "../../../src/components/company/discover/Pagination";

const JobSearchPage = () => {
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
            <div className="sm:mt-40 mt-30 mb-20">
                <div className='flex justify-center items-center flex-col mb-14'>
                    <h1 className="xl:mb-8 mb-6 text-xl sm:text-3xl lg:text-4xl font-bold">
                        Discover the Best Jobs
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
                    </div>
                </div>

                <div className='flex justify-center gap-4'>
                    {/* Sidebar */}
                    <div className="hidden lg:block">
                        <JsSidebar />
                    </div>

                    {/* OffCanvasSidebar */}
                    <OffCanvasSidebarJs
                        isOpen={isSidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />

                    <div className='flex flex-col gap-4 sm:mx-10 md:mx-13 lg:mx-0 mx-4 lg:w-[720px] xl:w-[975px] w-full'>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <JsJobCard
                                logo="/images/jobco1.jpg"
                                company="Sanford Group"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Canada"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco2.svg"
                                company="Rosenbaum LLC"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Canada"
                                salary="25 45$ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco3.png"
                                company="Hettinger LLC"
                                title="UI/UX Designer"
                                types={["Full-Time"]}
                                location="Canada"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco4.png"
                                company="Kemmer-Effertz"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Canada"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco5.png"
                                company="Renner Group"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Karnataka"
                                salary="25 35$ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco6.png"
                                company="Tromp Group"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco7.png"
                                company="Schumm and Sons"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Andra Pradesh"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco8.png"
                                company="Ritchie LLC"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Kerala"
                                salary="25 55$ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco9.png"
                                company="Schumm-Cormier"
                                title="UI/UX Designer"
                                types={["Part-Time", "Senior"]}
                                location="Kerala"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco10.png"
                                company="Lesch PLC"
                                title="UI/UX Designer"
                                types={["Part-Time"]}
                                location="Kerala"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco11.png"
                                company="Runte, Flatley and Miller"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Andra Pradesh"
                                salary="25 35$ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco12.png"
                                company="Bruen and Sons"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Andra Pradesh"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco13.png"
                                company="Hudson Ltd"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Karnataka"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco13.png"
                                company="Marvin and Sons"
                                title="UI/UX Designer"
                                types={["Mid-Level", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco14.png"
                                company="Brekke-Willms"
                                title="UI/UX Designer"
                                types={["Full-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco4.png"
                                company="Swift-Ziemann"
                                title="Sales Manager"
                                types={["Full-Time", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco15.png"
                                company="Abernathy Ltd"
                                title="UI/UX Designer"
                                types={["Hybrid", "Part-Time"]}
                                location="Karnataka"
                                salary="25 35$ / Month"
                                postedTime="1 hour ago"
                            />

                            <JsJobCard
                                logo="/images/jobco16.png"
                                company="Conn Group"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />
                        </div>

                        <Pagination totalPages={10} currentPage={1} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobSearchPage;