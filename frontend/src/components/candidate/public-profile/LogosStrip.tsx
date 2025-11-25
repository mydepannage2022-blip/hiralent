"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LogosStrip() {
    const logos = [
        { src: "/images/companylogo.png", alt: "Revolut" },
        { src: "/images/companylogo-2.png", alt: "Reddit" },
        { src: "/images/companylogo-3.png", alt: "Hello Fresh" },
        { src: "/images/companylogo-4.png", alt: "Nike" },
    ];

    return (
        <section className="px-4 md:max-w-[920px] lg:max-w-5xl xl:max-w-7xl container mx-auto border-b border-gray-200">
            <div className="py-6 flex flex-wrap items-center justify-center md:justify-between">

                {/* Reviews Badge */}
                <div className="flex items-center gap-3 mb-5 md:mb-0">

                    {/* G2 Logo */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M16 32C24.8384 32 32 24.8384 32 16C32 7.168 24.8384 0 16 0C7.1616 0 0 7.1616 0 16C0 24.8384 7.1616 32 16 32ZM18.7664 13.3627H22.8997V12.2227H20.1677C20.2444 11.7912 20.5068 11.5465 21.0442 11.276L21.5497 11.0184C22.4454 10.5547 22.9253 10.033 22.9253 9.17648C22.9253 8.64193 22.7206 8.21687 22.3047 7.90774C21.9016 7.5986 21.4089 7.45047 20.8395 7.45047C20.3852 7.45047 19.9693 7.5664 19.5918 7.80469C19.2207 8.04298 18.9392 8.33924 18.7664 8.71278L19.5598 9.51138C19.8669 8.88666 20.3084 8.57753 20.8971 8.57753C21.3897 8.57753 21.6968 8.83514 21.6968 9.18936C21.6968 9.48561 21.5497 9.73679 20.9802 10.0266L20.6603 10.1876C19.9565 10.5483 19.4702 10.954 19.1887 11.4177C18.9072 11.875 18.7664 12.461 18.7664 13.1695V13.3627ZM18.0114 14.6765H22.535L24.8 18.618L22.5414 22.5595L20.2764 18.618H15.7528L18.0114 14.6765ZM10.9221 15.9968C10.9221 18.8949 13.2639 21.2521 16.1431 21.2521C17.442 21.2521 18.6321 20.7691 19.5406 19.9833L21.5241 23.4353C20.0141 24.5431 18.1522 25.2 16.1431 25.2C11.0885 25.2 7 21.0782 7 15.9968C7 10.9218 11.0949 6.8 16.1431 6.8C16.7574 6.8 17.3524 6.85796 17.9347 6.97389L16.1431 10.7415C13.2639 10.7415 10.9221 13.0986 10.9221 15.9968Z"
                                fill="#1B1B1B"
                            />
                        </svg>
                    </div>

                    {/* Stars + Reviews */}
                    <div className="flex items-center gap-4">
                        <span className="text-2xl text-black">★★★★★</span>
                        <a href="#" className="text-sm md:text-base font-medium flex items-center gap-2">
                            10097+ reviews <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* DESKTOP GRID (md and up) */}
                <div className="hidden md:grid grid-cols-4 items-center gap-3 md:gap-6 lg:gap-12">
                    {logos.map((logo, i) => (
                        <Image
                            key={i}
                            src={logo.src}
                            alt={logo.alt}
                            width={100}
                            height={40}
                            className="object-contain mx-auto"
                        />
                    ))}
                </div>

                {/* MOBILE/TABLET AUTO SLIDER (below md) */}
                <div className="md:hidden overflow-hidden w-full relative mt-4">
                    <div className="slider-track">
                        {logos.concat(logos).map((logo, i) => (
                            <Image
                                key={i}
                                src={logo.src}
                                alt={logo.alt}
                                width={100}
                                height={40}
                                className="object-contain"
                            />
                        ))}
                    </div>

                    <style jsx>{`
                        .slider-track {
                            display: flex;
                            gap: 2.5rem;
                            animation: scroll 14s linear infinite;
                        }
                        .slider-track:hover {
                            animation-play-state: paused;
                        }
                        @keyframes scroll {
                            0% {
                                transform: translateX(0);
                            }
                            100% {
                                transform: translateX(-50%);
                            }
                        }
                    `}</style>
                </div>
            </div>
        </section>
    );
}