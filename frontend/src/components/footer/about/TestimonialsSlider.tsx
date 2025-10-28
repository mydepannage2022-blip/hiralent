"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import TestimonialCard from "./TestimonialCard";

interface Testimonial {
    name: string;
    role: string;
    avatar: string;
    text: string;
    rating: number;
    likes: number;
    dislikes: number;
}

interface Props {
    testimonials: Testimonial[];
}

const TestimonialsSlider: React.FC<Props> = ({ testimonials }) => {
    return (
        <div className="w-full">
            <Swiper
                modules={[Pagination]}
                pagination={{ clickable: true }}
                spaceBetween={24}
                slidesPerView={1}
                className="pb-10"
            >
                {testimonials.map((t, idx) => (
                    <SwiperSlide key={idx}>
                        <TestimonialCard {...t} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default TestimonialsSlider;