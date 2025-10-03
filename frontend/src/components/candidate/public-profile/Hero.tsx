"use client";

import Image from "next/image";
import ProfileCard from "./ProfileCard";
import { Download } from "lucide-react";

export default function Hero() {
    return (
        <section className="px-4 sm:p-0 relative bg-[#EFF5FF] overflow-hidden">
            {/* Background SVG shape */}
            <svg
                className="absolute right-[-250px] top-[550px] w-[575px] h-[575px] sm:right-[115px] sm:top-[440px] sm:w-[615px] sm:h-[615px] md:right-[340px] md:top-[450px] md:w-[640px] md:h-[640px] lg:right-[-150px] lg:top-[115px] lg:w-[1024px] lg:h-[1024px] xl:right-[-100px] xl:top-[115px] 2xl:right-[400px] 2xl:top-[115px] xl:w-[1080px] xl:h-[1080px] text-[#005DDC] z-0"
                viewBox="0 0 1304 1294"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M343.084 0L403.837 509.014L0 936.583L622.421 1293.63L816.085 745.495L1303.12 554.278L343.084 0Z"
                    fill="currentColor"
                />
            </svg>

            <div className="sm:max-w-[690px] md:max-w-[920px] lg:max-w-5xl xl:max-w-7xl container mx-auto py-40 pb-80 lg:py-40 grid lg:grid-cols-2 gap-8 items-start relative z-10">
                {/* LEFT: Text block */}
                <div className="max-w-xl">
                    <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold leading-tight text-[#111827]">
                        <span className="inline-block name-highlight">Meet huzaifa</span>
                    </h1>

                    <p className="mt-2 text-base md:text-2xl font-semibold text-[#1f2937]">
                        2 years in MERN Stack Development
                    </p>

                    <p className="mt-6 text-sm md:text-base text-[#4b5563] max-w-lg">
                        A developer who just not build apps who build legacy
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-[#374151] font-semibold">Sign up now and get a discount hiring</span>

                        <span className="inline-flex items-center gap-2 bg-[#005DDC] text-white px-3 py-2 rounded-full text-sm font-medium">
                            <Image src="/images/pkflag.png" width={18} height={12} alt="PK" />
                            huzaifa in PK
                        </span>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button
                            className="rounded-full px-5 py-3 bg-[#1B1B1B] text-white font-medium shadow-sm hover:opacity-95 transition"
                            aria-label="Request a demo"
                        >
                            Request a demo
                        </button>

                        <button
                            className="rounded-full px-5 py-3 border-2 border-[#1B1B1B29] flex items-center gap-2 font-medium hover:bg-yellow-50 transition"
                            aria-label="Download CV"
                        >
                            Download CV
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* RIGHT: Profile Card */}
                <div className="relative">
                    <div className="absolute lg:left-[-25px] lg:top-10">
                        <ProfileCard />
                    </div>
                </div>
            </div>
        </section>
    );
}