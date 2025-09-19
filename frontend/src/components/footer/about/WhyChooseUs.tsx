'use client'

import React from "react";
import HelpCardGrid from "../about/HelpCardGrid";

const helpCards = [
    {
        icon: "/images/help7.png",
        title: "Tailored Recruitment Solutions",
        description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
    },
    {
        icon: "/images/help8.png",
        title: "Expert in Hiring & Job Search",
        description: "Our experienced team will help you in the best way possible in the field of job search and recruitment."
    },
    {
        icon: "/images/help9.png",
        title: "Commitment to Quality",
        description: "We prioritize integrity, transparency, and efficiency, ensuring a seamless hiring experience."
    },
    {
        icon: "/images/help10.png",
        title: "Extensive Talent Network",
        description: "Access a wide pool of qualified candidates ready to enhance your business."
    },
    {
        icon: "/images/help11.png",
        title: "Long-Term Partnerships",
        description: "We build lasting relationships through trust, reliability, and consistent results."
    },
    {
        icon: "/images/help12.png",
        title: "Quality & Integrity",
        description: "We ensure transparency, efficiency, and lasting partnerships built on trust and excellence."
    },
];

const WhoWeAre = () => {
    return (
        <section id="why-choose-us" className="py-12 mx-auto">
            <h2 className="text-2xl md:text-4xl font-medium text-center mb-3">Why choose us</h2>
            <p className="text-center text-[#757575] mb-8">With us, hiring becomes simple, efficient, and effective.</p>

            <HelpCardGrid cards={helpCards} />
        </section>
    );
};

export default WhoWeAre;