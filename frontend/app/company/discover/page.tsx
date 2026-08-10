'use client';

import React, { useState } from 'react';
import CompanySearch from '../../../src/components/company/discover/CompanySearch';
import { locationOptions } from "../../../src/constants/groupedLocationOptions";
import Tabs from "../../../src/components/company/discover/Tabs";
import Sidebar from '../../../src/components/company/discover/Sidebar';
import OffCanvasSidebar from '../../../src/components/company/discover/OffCanvasSidebar';
import { Filter, Loader2, AlertTriangle, Building2 } from "lucide-react";
import CompanyCard from '../../../src/components/company/discover/CompanyCard';
import Pagination from "../../../src/components/company/discover/Pagination";
import { useDiscoverCompanies } from '@/src/lib/company/employer.queries';

const PAGE_SIZE = 12;

const DiscoverPage = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [location, setLocation] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, refetch } = useDiscoverCompanies({
        search,
        location,
        page,
        limit: PAGE_SIZE,
    });

    const companies = data?.companies ?? [];
    const pagination = data?.pagination;

    const handleSearch = (title: string, loc: any) => {
        setSearch((title || "").trim());
        setLocation((loc?.value || "").trim());
        setPage(1);
    };

    const customStyles = {
        control: (base: any) => ({
            ...base,
            padding: "0px 8px",
            borderRadius: "8px",
            borderColor: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
            fontSize: "14px",
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
            color: "#111",
            padding: "8px",
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
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-[#515151]">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Loading companies…</p>
                            </div>
                        ) : isError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
                                <p className="text-sm text-[#515151] mb-4">Couldn&apos;t load companies.</p>
                                <button
                                    onClick={() => refetch()}
                                    className="px-5 py-2 rounded-lg bg-[#005DDC] text-white text-sm font-medium hover:bg-[#0046B3] transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Building2 className="w-10 h-10 text-[#CBCBCB] mb-3" />
                                <p className="text-lg font-semibold text-black">No companies found</p>
                                <p className="text-sm text-[#757575] mt-1">
                                    {search || location
                                        ? "Try a different search or location."
                                        : "Check back soon as more companies join."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {companies.map((c, idx) => {
                                    const badges: { label: string; type: 'blue' | 'green' }[] = [];
                                    if (c.verified) badges.push({ label: 'Verified', type: 'blue' });
                                    if (c.active_jobs_count > 0) badges.push({ label: 'Hiring', type: 'green' });

                                    // Navigate by public slug, falling back to the company
                                    // name (both are accepted by the public resolver). The
                                    // internal company_id/PK is no longer exposed by the API.
                                    const navId = c.slug || c.company_name || undefined;
                                    return (
                                        <CompanyCard
                                            key={c.slug || c.company_name || c.display_name || `company-${idx}`}
                                            logo={c.logo_url}
                                            name={c.display_name || c.company_name || 'Company'}
                                            location={c.headquarters}
                                            rating={c.rating}
                                            badges={badges}
                                            description={c.tagline || c.industry}
                                            jobs={c.active_jobs_count}
                                            slug={navId}
                                        />
                                    );
                                })}

                                {pagination && pagination.totalPages > 1 && (
                                    <Pagination
                                        totalPages={pagination.totalPages}
                                        currentPage={page}
                                        onPageChange={setPage}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoverPage;
