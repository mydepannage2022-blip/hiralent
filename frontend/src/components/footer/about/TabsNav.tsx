"use client";

import { useState } from "react";

const tabs = [
    { id: "about", label: "About Hiralent" },
    { id: "who-we-are", label: "Who We Are" },
    { id: "why-choose-us", label: "Why Choose Us" },
    { id: "people-says", label: "What our People Says" },
    { id: "our-team", label: "Our Team" },
];

export default function TabsNav() {
    const [active, setActive] = useState("about");

    const handleScroll = (id: string) => {
        setActive(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <nav className="border-b border-[#CBCBCB] flex justify-center gap-12 flex-wrap">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleScroll(tab.id)}
                    className={`pb-2 md:text-lg font-medium ${active === tab.id
                            ? "border-b-2 border-[#005DDC] text-[#005DDC]"
                            : "text-[#515151] hover:text-[#005DDC] hover:order-b-2 hover:border-[#005DDC]"
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}