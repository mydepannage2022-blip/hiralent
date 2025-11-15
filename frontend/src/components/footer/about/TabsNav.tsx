"use client";

import React from "react";
import { useEffect, useState } from "react";

const tabs = [
    { id: "about", label: "About Hiralent" },
    { id: "who-we-are", label: "Who We Are" },
    { id: "why-choose-us", label: "Why Choose Us" },
    { id: "people-says", label: "What our People Says" },
    { id: "our-team", label: "Our Team" },
];

const TabsNav = () => {
    const [active, setActive] = useState<string>("about");

    // scroll to section and set active immediately (gives instant UI feedback)
    const handleScroll = (id: string) => {
        setActive(id);
        const element = document.getElementById(id);
        if (!element) return;
        // If you have a fixed header, change offset (e.g. 80)
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    };

    useEffect(() => {
        // IntersectionObserver that chooses the section with the largest visible area
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries || entries.length === 0) return;

                // pick the entry with the highest intersectionRatio
                let best = entries[0];
                for (const e of entries) {
                    if (e.intersectionRatio > best.intersectionRatio) best = e;
                }

                // If the best entry is at least slightly visible, update active
                if (best && best.isIntersecting) {
                    setActive(best.target.id);
                } else {
                    // If none are intersecting, pick the entry with positive ratio if any
                    const anyVisible = entries.find((e) => e.intersectionRatio > 0);
                    if (anyVisible) setActive(anyVisible.target.id);
                }
            },
            {
                root: null,
                rootMargin: "0px 0px -30% 0px", // shift the detection a bit upward (adjust if you have sticky header)
                threshold: [0.01, 0.1, 0.25, 0.5, 0.75, 1], // multiple thresholds to let intersectionRatio vary
            }
        );

        // Observe each section if it exists
        tabs.forEach((tab) => {
            const el = document.getElementById(tab.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <nav className="border-b border-[#CBCBCB] flex justify-center gap-3 sm:gap-6 md:gap-12 flex-wrap">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleScroll(tab.id)}
                    aria-current={active === tab.id ? "true" : undefined}
                    className={`pb-2 text-xs sm:text-sm md:text-lg font-medium ${active === tab.id
                            ? "border-b-2 border-[#005DDC] text-[#005DDC]"
                            : "text-[#515151] hover:text-[#005DDC]"
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
};

export default TabsNav;
