import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import TestimonialCard from "./TestimonialCard";
import { useScreenSize } from "../../../customhooks/useScreenSize"

interface Testimonial {
    description: string;
    name: string;
    role: string;
    avatar: string;
    company: {
        name: string;
        logo: string;
    };
}

interface TestimonialsSliderProps {
    testimonials: Testimonial[];
}

const TestimonialsSlider: React.FC<TestimonialsSliderProps> = ({ testimonials }) => {
    const width = useScreenSize();

    let displayedTestimonials: Testimonial[] = [];

    if (width >= 1024) {
        displayedTestimonials = testimonials.slice(0, 15); // desktop
    } else if (width >= 640) {
        displayedTestimonials = testimonials.slice(0, 10); // tablet
    } else {
        displayedTestimonials = testimonials.slice(0, 5); // mobile
    }

    return (
        <div className="w-full sm:mx-6 sm:max-w-[688px] md:mx-9 md:max-w-[920px] lg:max-w-5xl xl:max-w-7xl lg:mx-auto py-4 sm:py-12">
            <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                pagination={{ clickable: true }}
                breakpoints={{
                    0: { slidesPerView: 1, slidesPerGroup: 1 },
                    640: { slidesPerView: 2, slidesPerGroup: 2 },
                    1024: { slidesPerView: 3, slidesPerGroup: 3 },
                }}
                className="pb-10"
            >
                {displayedTestimonials.map((t, idx) => (
                    <SwiperSlide key={idx}>
                        <TestimonialCard {...t} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default TestimonialsSlider;