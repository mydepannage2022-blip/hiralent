'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface OffcanvasSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const OffcanvasSidebar: React.FC<OffcanvasSidebarProps> = ({ isOpen, onClose }) => {
    const [openSections, setOpenSections] = useState({
        workplace: true,
        gender: true,
        companySize: true,
    });

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const Section = ({
        title,
        name,
        children,
    }: {
        title: string;
        name: keyof typeof openSections;
        children: React.ReactNode;
    }) => {
        const contentRef = useRef<HTMLDivElement>(null);
        const [height, setHeight] = useState('0px');

        useEffect(() => {
            if (openSections[name]) {
                const scrollHeight = contentRef.current?.scrollHeight || 0;
                setHeight(`${scrollHeight}px`);
            } else {
                setHeight('0px');
            }
        }, [openSections, name]);

        return (
            <div className='mb-0 px-2'>
                <div
                    className="flex justify-between items-center cursor-pointer px-2"
                    onClick={() => toggleSection(name)}
                >
                    <h3 className="text-lg font-medium">{title}</h3>
                    {openSections[name] ? (
                        <ChevronUp size={20} className="text-[#515151] hover:text-black" />
                    ) : (
                        <ChevronDown size={20} className="text-[#515151] hover:text-black" />
                    )}
                </div>

                <div
                    ref={contentRef}
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{
                        maxHeight: height,
                        opacity: openSections[name] ? 1 : 0,
                    }}
                >
                    <div className="mt-4 space-y-3">{children}</div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Offcanvas */}
            <div
                className={`fixed top-0 left-0 h-full w-full sm:w-[18rem] bg-white shadow-lg z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="h-full flex flex-col">
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto py-6 px-2">
                        <div className="px-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-medium mb-3">All Filters</h2>
                                <div className="mb-2">
                                    <h3 className="text-lg font-medium mb-2">Active Filters</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-[#EDEDED] text-sm text-[#757575] px-2 py-1 rounded-lg">
                                            Culture & values <span className="text-black font-medium cursor-pointer ml-1">✕</span>
                                        </span>
                                        <span className="bg-[#EDEDED] text-sm text-[#757575] px-2 py-1 rounded-lg">
                                            Company size 100+ <span className="text-black font-medium cursor-pointer ml-1">✕</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                aria-label="Close filters"
                                className="ml-4 lg:hidden text-[#515151] hover:text-black"
                                onClick={onClose}
                            >
                                ✕
                            </button>
                        </div>

                        <hr className="mb-4 border-[#EDEDED]" />

                        {/* Workplace */}
                        <Section title="Workplace" name="workplace">
                            {['Work/life balance', 'Career opportunities', 'Culture & values', 'Senior Management'].map(
                                item => (
                                    <label key={item} className="flex items-center gap-2 text-sm text-[#353535]">
                                        <input type="checkbox" />
                                        {item}
                                    </label>
                                )
                            )}
                        </Section>

                        <hr className="my-4 border-[#EDEDED]" />

                        {/* Gender */}
                        <Section title="Gender" name="gender">
                            {['Male', 'Female', 'Other'].map(item => (
                                <label key={item} className="flex items-center gap-2 text-sm text-[#353535]">
                                    <input type="radio" name="gender" />
                                    {item}
                                </label>
                            ))}
                        </Section>

                        <hr className="my-4 border-[#EDEDED]" />

                        {/* Company Size */}
                        <Section title="Company size" name="companySize">
                            {['1 - 50', '51 - 200', '201 - 500', '501 - 1000', '1000+'].map(item => (
                                <label key={item} className="flex items-center gap-2 text-sm text-[#353535]">
                                    <input type="radio" name="company-size" />
                                    {item}
                                </label>
                            ))}
                        </Section>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OffcanvasSidebar;