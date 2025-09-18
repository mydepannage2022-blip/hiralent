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
        <nav className="border-b border-gray-200 flex justify-center gap-6 flex-wrap">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleScroll(tab.id)}
                    className={`pb-2 text-sm md:text-base ${active === tab.id
                            ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}