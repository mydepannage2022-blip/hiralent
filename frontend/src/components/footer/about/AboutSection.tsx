'use client'

import React from "react";
import Image from "next/image";

const AboutSection = () => {
    return (
        <section id="about" className="py-12 mx-auto">
            <h2 className="text-2xl md:text-4xl font-medium text-center mb-3">About us</h2>
            <p className="text-center text-[#757575] mb-12">The last job offers Upload</p>

            <div className="grid md:grid-cols-2 gap-20 items-center">
                {/* Left Content */}
                <div className="text-[#757575] leading-relaxed md:text-sm lg:text-base xl:text-xl">
                    <p>
                        At <span className="font-semibold text-[#222222]">Hiralent</span>,
                    </p>
                    <div className="mb-4">
                        <p>we connect talented professionals with top career opportunities.</p>
                        <p>
                            Since <span className="font-semibold text-[#222222]">2025</span> our mission has been to provide tailored recruitment
                            solutions that fit the unique needs of employers and candidates.
                        </p>
                        <p>
                            Specializing in <span className="font-semibold text-[#222222]">Job search and recruitment</span>, we offer comprehensive hiring
                            services to ensure the perfect match.
                        </p>
                    </div>
                    <p>
                        Our commitment to integrity, transparency, and excellence drives lasting relationships and successful outcomes. Whether you&apos;re advancing your career or seeking the right talent, we&apos;re here to support you.
                    </p>
                </div>

                {/* Right Image with breakout badges */}
                <div className="relative w-full h-64 md:h-80 lg:h-96">
                    {/* Image container */}
                    <div className="w-full mx-auto max-w-[475px] sm:max-w-[375px] lg:max-w-[425px] xl:max-w-[540px] h-full rounded-xl overflow-hidden relative">
                        <Image
                            src="/images/About-us1.png"
                            alt="About Hiralent"
                            fill
                            className="object-cover rounded-lg"
                        />
                    </div>

                    {/* Top-right card — half in, half out */}
                    <div className="absolute top-6 -right-2 sm:right-24 md:right-0">
                        <div className="bg-[#F9F9F9] rounded-lg px-4 py-2 text-center">
                            <p className="text-[#515151] text-xs md:text-sm mb-2">Monthly employed</p>
                            <p className="text-base md:text-xl font-semibold text-[#222222]">
                                5000 +
                            </p>
                        </div>
                    </div>

                    {/* Bottom-left reviews card — half in, half out */}
                    <div className="absolute bottom-6 -left-2 sm:left-24 md:-left-12">
                        <div className="bg-[#F9F9F9] rounded-lg px-4 py-2 flex flex-col items-center">
                            {/* Row 1: avatars + plus */}
                            <div className="flex items-center">
                                <Image
                                    src="/images/bl-avatar1.png"
                                    alt="Reviewer 1"
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                                <Image
                                    src="/images/bl-avatar-2.png"
                                    alt="Reviewer 2"
                                    width={24}
                                    height={24}
                                    className="rounded-full ml-12"
                                />
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black -ml-2">
                                    <span className="text-2xl -mt-2">+</span>
                                </div>
                            </div>

                            {/* Row 2: reviews text */}
                            <p className="mt-2 text-[#222222] text-lg text-center">
                                <span className="font-medium">5000+</span> reviews
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
