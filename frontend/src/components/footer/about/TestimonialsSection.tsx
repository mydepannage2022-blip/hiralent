"use client";

import React from "react";
import Image from "next/image";
import TestimonialsSlider from "./TestimonialSlider";

interface TestimonialData {
    name: string;
    role: string;
    avatar: string;
    text: string;
    rating?: number;
    likes?: number;
    dislikes?: number;
}

interface Props {
    testimonials?: TestimonialData[];
}

const TestimonialsSection: React.FC<Props> = ({ testimonials }) => {
    // fallback dummy testimonials
    const defaultTestimonials: TestimonialData[] = [
        {
            name: "John Doe",
            role: "Software Engineer",
            avatar: "/images/user1.jpg",
            text: "This platform helped me land my dream job quickly!",
            rating: 4.8,
            likes: 124,
            dislikes: 3,
        },
        {
            name: "Jane Smith",
            role: "HR Manager",
            avatar: "/images/user2.jpg",
            text: "We’ve hired excellent candidates thanks to this site.",
            rating: 4.6,
            likes: 98,
            dislikes: 2,
        },
    ];

    const data = testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

    return (
        <section className="relative py-20 px-4">
            <div className="max-w-7xl mx-auto relative">
                {/* BACKGROUND CONTAINER */}
                <div className="bg-[#F5F5F6] rounded-2xl w-full h-full py-12 lg:py-20 px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* LEFT side reserved for image */}
                        <div className="hidden lg:block"></div>

                        {/* RIGHT side: slider INSIDE container */}
                        <div>
                            <TestimonialsSlider testimonials={data} />
                        </div>
                    </div>
                </div>

                {/* LEFT IMAGE floating ABOVE container */}
                <div className="absolute top-0 left-0 -mt-16 lg:-mt-100 z-20">
                    <Image
                        src="/images/peoplesays1.png"
                        alt="Testimonial visual"
                        width={640}
                        height={640}
                        className="object-cover rounded-2xl"
                    />
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;