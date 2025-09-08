"use client";

import Accordion, { AccordionItem } from "./Accoridian";

type FAQSectionProps = {
    title: string;
    tabs: string[];
    items: AccordionItem[];
};

const FAQSection = ({ title, tabs, items }: FAQSectionProps) => {
    return (
        <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
            <p className="text-gray-600 text-center mt-1">
                Find answers to common questions about our plans, payments, and policies.
            </p>

            {/* Tabs */}
            <div className="mt-6 flex justify-center gap-2 flex-wrap">
                {tabs.map((tab, idx) => (
                    <button
                        key={idx}
                        className="rounded-full border px-4 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-blue-100 transition"
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Accordion */}
            <div className="mt-6 max-w-2xl mx-auto">
                <Accordion items={items} />
            </div>
        </section>
    );
};

export default FAQSection;