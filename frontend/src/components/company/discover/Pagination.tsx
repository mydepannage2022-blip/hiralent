'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    onPageChange?: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ totalPages, currentPage, onPageChange }) => {
    // Ensure currentPage is within valid range
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const goTo = (page: number) => {
        if (!onPageChange) return;
        const next = Math.min(Math.max(1, page), totalPages);
        if (next !== safeCurrentPage) onPageChange(next);
    };

    // Dynamically generate pages: first 3, ellipsis if needed, last 2
    const pages: (number | string)[] = [];

    // Always include first 3 pages
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
        pages.push(i);
    }

    // Add ellipsis if totalPages > 5 and there are more pages after 3
    if (totalPages > 5 && (pages[pages.length - 1] as number) < totalPages - 2) {
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
            <button
                type="button"
                onClick={() => goTo(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="text-[#515151] hover:text-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
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
                        type="button"
                        onClick={() => goTo(page as number)}
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
            <button
                type="button"
                onClick={() => goTo(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="text-[#515151] hover:text-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default Pagination;
