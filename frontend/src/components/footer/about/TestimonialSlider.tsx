"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import TestimonialCard from "./TestimonialCard";

interface IncomingTestimonial {
    description?: string;
    text?: string;
    name: string;
    role: string;
    avatar: string;
    rating?: number;
    likes?: number;
    dislikes?: number;
}

interface TestimonialsSliderProps {
    testimonials: IncomingTestimonial[];
}

const TestimonialsSlider: React.FC<TestimonialsSliderProps> = ({ testimonials }) => {
    if (!testimonials || testimonials.length === 0) return null;

    return (
        <div className="w-full py-6">
            <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                pagination={{ clickable: true }}
                slidesPerView={1}
                className="pb-4"
            >
                {testimonials.map((t, idx) => (
                    <SwiperSlide key={idx}>
                        <TestimonialCard
                            name={t.name}
                            role={t.role}
                            avatar={t.avatar}
                            rating={t.rating ?? 4.5}
                            text={t.text ?? t.description ?? ""}
                            likes={t.likes ?? 0}
                            dislikes={t.dislikes ?? 0}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default TestimonialsSlider;