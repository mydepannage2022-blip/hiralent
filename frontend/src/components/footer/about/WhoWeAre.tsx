'use client'

import React from "react";
import { Briefcase } from "lucide-react";

const stats = [
    { id: 1, label: "Live Jobs", value: "1,75,324", icon: Briefcase },
    { id: 2, label: "Candidates", value: "2,750", icon: Briefcase },
    { id: 3, label: "Companies", value: "97,354", icon: Briefcase },
];

const WhoWeAre = () => {
    return (
        <section id="who-we-are" className="py-12 mx-auto">
            <h2 className="text-2xl md:text-4xl font-medium text-center mb-3">Who we are</h2>
            <p className="text-center text-[#757575] mb-12">Get to know us</p>

            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div>
                    <h3 className="text-2xl sm:text-5xl md:text-4xl xl:text-5xl font-semibold mb-12">
                        We’re highly skilled and professionals team.
                    </h3>
                    <p className="text-[#222222] leading-relaxed text-lg">
                        We provide tailored recruitment solutions designed to connect the best
                        talent with top companies. Our commitment to excellence, transparency,
                        and efficiency ensures successful outcomes for both employers and
                        candidates.
                    </p>
                </div>

                {/* Right Stats */}
                <div className="grid grid-cols-1 gap-6">
                    {stats.map((stat) => (
                        <div
                            key={stat.id}
                            className="flex items-center gap-6"
                        >
                            {/* Icon with background circle */}
                            <div className="w-22 h-20 flex items-center justify-center rounded-lg bg-[#EFF5FF]">
                                <stat.icon className="w-8 h-8 text-[#004EB7]" />
                            </div>

                            {/* Texts */}
                            <div>
                                <p className="text-xl font-semibold text-[#222222] mb-1">{stat.value}</p>
                                <p className="text-[#515151] text-base font-medium">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default WhoWeAre
