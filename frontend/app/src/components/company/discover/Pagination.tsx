'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ totalPages, currentPage }) => {
    // Ensure currentPage is within valid range
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    // Dynamically generate pages: first 3, ellipsis if needed, last 2
    const pages = [];
    const maxVisiblePages = 5; // Total visible pages (e.g., 3 + ellipsis + 2)

    // Always include first 3 pages
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
        pages.push(i);
    }

    // Add ellipsis if totalPages > 5 and there are more pages after 3
    if (totalPages > 5 && pages[pages.length - 1] < totalPages - 2) {
        pages.push('...');
    }

    // Add last 2 pages if totalPages > 3
    if (totalPages > 3) {
        for (let i = Math.max(totalPages - 1, 4); i <= totalPages; i++) {
            pages.push(i);
        }
    }

    return (
        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-4">
            {/* Previous Icon */}
            <button className="text-[#515151] hover:text-black cursor-pointer">
                <ChevronLeft size={20} />
            </button>

            {/* Pages */}
            {pages.map((page, idx) => {
                if (page === '...') {
                    return <span key={idx} className="text-[#A5A5A5] text-lg">...</span>;
                }
                return (
                    <button
                        key={idx}
                        className={`px-3 py-1 font-medium ${page === safeCurrentPage
                            ? 'border border-black rounded-md bg-white text-black cursor-pointer'
                            : 'text-black cursor-pointer'
                            }`}
                    >
                        {page}
                    </button>
                );
            })}

            {/* Next Icon */}
            <button className="text-[#515151] hover:text-black cursor-pointer">
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default Pagination;