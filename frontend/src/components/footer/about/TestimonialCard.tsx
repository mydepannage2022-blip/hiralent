"use client";

import React from "react";
import Image from "next/image";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface TestimonialCardProps {
    name: string;
    role: string;
    avatar: string;
    rating: number;
    text: string;
    likes: number;
    dislikes: number;
}

const TestimonialCard = ({
    name,
    role,
    avatar,
    rating,
    text,
    likes,
    dislikes,
}: TestimonialCardProps) => {
    return (
        <div className="bg-white border border-[#EDEDED] rounded-lg p-6 flex flex-col justify-between">
            {/* Top section */}
            <div className="flex items-start gap-3 sm:gap-5">
                {/* Quote mark */}
                <Image
                    src="/images/quote.png"
                    alt="quote"
                    width={32}
                    height={32}
                    className="object-contain flex-shrink-0 sm:mt-1"
                />

                {/* Avatar + Info + Rating */}
                <div className="flex flex-1 items-start justify-between">
                    <div className="flex items-center gap-2">
                        <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <p className="text-sm sm:text-lg font-semibold text-gray-900">
                                {name}
                            </p>
                            <p className="text-sm text-[#A5A5A5]">{role}</p>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="#F6B500"
                            className="w-4 h-4"
                        >
                            <path
                                d="M12 2.5l2.9 5.88 6.5.95-4.7 4.58 1.1 6.44L12 17.77l-5.8 3.05 1.1-6.44-4.7-4.58 6.5-.95L12 2.5z"
                                stroke="#F6B500"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="text-sm font-medium text-[#515151]">
                            {rating.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Review text */}
            <p className="text-base sm:text-lg mt-4 text-[#222222] leading-relaxed">
                {text}
            </p>

            {/* Footer */}
            <div className="mt-4 flex items-center text-[#222222]">
                <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    <span>{likes}</span>
                </div>

                <div className="w-px bg-[#222222] mx-4 self-stretch"></div>

                <div className="flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5" />
                    <span>{dislikes}</span>
                </div>
            </div>
        </div>
    );
};

export default TestimonialCard;