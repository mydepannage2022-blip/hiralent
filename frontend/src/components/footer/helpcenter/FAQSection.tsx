"use client";

import { useState } from "react";
import Accordion, { AccordionItem } from "./Accoridian";

type FAQSectionProps = {
    title: string;
    tabs: string[];
    items: AccordionItem[];
};

const FAQSection = ({ title, tabs, items }: FAQSectionProps) => {
    const [activeTab, setActiveTab] = useState(tabs[0]); // default to first tab

    const filteredItems = items.filter(
        (item) =>
            !("category" in item) || item.category === activeTab // fallback if no category
    );

    return (
        <section className="mt-20">
            <div className="flex flex-col justify-center items-center">
                <h1 className="text-3xl sm:text-4xl font-semibold w-full text-center">
                    {title}
                </h1>
                <p className="text-base text-[#515151] mt-4 max-w-[450px] text-center"> Find answers to common questions about our plans, payments, and policies.</p>
            </div>

            {/* Tabs */}
            <div className="mt-8 flex justify-center gap-2 flex-wrap">
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

            {/* Accordion */}
            <div className="mt-6 w-full mx-auto">
                <Accordion items={filteredItems} />
            </div>
        </section>
    );
};

export default FAQSection;