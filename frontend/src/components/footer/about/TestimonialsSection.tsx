"use client";

import React from "react";
import Image from "next/image";
import TestimonialsSlider from "./TestimonialsSlider";

const testimonials = [
    {
        name: "Marvin McKinney",
        role: "Job Seeker",
        avatar: "/images/avatar7.png",
        text: "When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process.",
        rating: 4.5,
        likes: 14,
        dislikes: 0,
    },
    {
        name: "Marvin McKinney",
        role: "Job Seeker",
        avatar: "/images/avatar7.png",
        text: "When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process.",
        rating: 4.5,
        likes: 14,
        dislikes: 0,
    },
    {
        name: "Marvin McKinney",
        role: "Job Seeker",
        avatar: "/images/avatar7.png",
        text: "When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process.",
        rating: 4.5,
        likes: 14,
        dislikes: 0,
    },
    {
        name: "Marvin McKinney",
        role: "Job Seeker",
        avatar: "/images/avatar7.png",
        text: "When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process.",
        rating: 4.5,
        likes: 14,
        dislikes: 0,
    },
    {
        name: "Marvin McKinney",
        role: "Job Seeker",
        avatar: "/images/avatar7.png",
        text: "When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process.",
        rating: 4.5,
        likes: 14,
        dislikes: 0,
    }
];

const TestimonialsSection = () => {
    return (
        <section id="people-says" className="relative py-12">
            <h2 className="text-2xl md:text-4xl font-medium text-center mb-3">What our people says</h2>
            <p className="text-center text-[#757575] mb-12 mx-auto">What people have said about us</p>

            <div className="mx-auto relative sm:mt-20">
                {/* Background container */}
                <div className="sm:bg-[#F5F5F6] rounded-lg w-full sm:pt-4 sm:pb-2 sm:px-13 lg:px-8 xl:px-26 relative z-10">
                    {/* Mobile image above slider */}
                    <div className="block lg:hidden mb-12 flex justify-center">
                        <Image
                            src="/images/peoplesays1.png"
                            alt="Testimonial visual"
                            width={320}
                            height={320}
                            className="object-cover rounded-2xl"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Left space only for desktop */}
                        <div className="hidden lg:block"></div>

                        {/* Right slider */}
                        <div>
                            <TestimonialsSlider testimonials={testimonials} />
                        </div>
                    </div>
                </div>

                {/* Floating left image (desktop only) */}
                <div className="absolute top-0 lg:left-8 xl:left-26 lg:-mt-8 z-20 hidden lg:block">
                    <Image
                        src="/images/peoplesays1.png"
                        alt="Testimonial visual"
                        width={425}
                        height={425}
                        className="object-cover rounded-2xl"
                    />
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;