'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Sidebar = () => {
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
                {/* Header */}
                <div
                    className="flex justify-between items-center cursor-pointer px-2"
                    onClick={() => toggleSection(name)}
                >
                    <h3 className="text-lg font-medium">{title}</h3>
                    {openSections[name] ? <ChevronUp size={20} className="text-[#515151] hover:text-black" /> : <ChevronDown size={20} className="text-[#515151] hover:text-black" />}
                </div>

                {/* Content */}
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
        <div className="w-full max-w-[18rem] border border-[#EDEDED] py-6 px-2 rounded-lg">
            {/* Filters Header */}
            <div className='px-4'>
                <h2 className="text-lg font-medium mb-3">All Filters</h2>
                <div className="mb-2">
                    <h2 className="text-lg font-medium mb-2">Active Filters</h2>
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-[#EDEDED] text-sm text-[#757575] px-2 py-1 rounded-lg ">
                            Culture & values <span className='text-black font-medium cursor-pointer'>✕</span>
                        </span>
                        <span className="bg-[#EDEDED] text-sm text-[#757575] px-2 py-1 rounded-lg">
                            Company size 100+ <span className='text-black font-medium cursor-pointer'>✕</span>
                        </span>
                    </div>
                </div>
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
    );
};

export default Sidebar;