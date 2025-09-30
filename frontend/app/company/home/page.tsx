'use client'

import React from 'react'
import Hero from '../../../src/components/company/home/Hero'
import RatingCard from "../../../src/components/company/home/RatingCard";
import CompanyLogo from "../../../src/components/company/home/CompanyLogo";
import SolutionsCard from "../../../src/components/company/home/SolutionsCard";
import HiringStrategyCard from "../../../src/components/company/home/HiringStrategyCard";
import TestimonialSlider from "../../../src/components/company/home/TestimonialSlider";
import PlansSection from "../../../src/components/company/home/PlansSection";
import { ChevronRight } from 'lucide-react';
import Marquee from "react-fast-marquee";

const page = () => {
    const reviewData = [
        { name: '1', value: 0 },
        { name: '2', value: 10 },
        { name: '3', value: 5 },
        { name: '4', value: 15 },
        { name: '5', value: 10 },
        { name: '6', value: 20 },
    ];

    const ratingData = [
        { name: '1', value: 0 },
        { name: '2', value: 10 },
        { name: '3', value: 5 },
        { name: '4', value: 15 },
        { name: '5', value: 10 },
        { name: '6', value: 20 },
    ];

    const companyData = [
        { name: '1', value: 0 },
        { name: '2', value: 10 },
        { name: '3', value: 5 },
        { name: '4', value: 15 },
        { name: '5', value: 10 },
        { name: '6', value: 20 },
    ];

    const row1 = ["/images/companylogo.png", "/images/companylogo-2.png", "/images/companylogo-3.png",
        "/images/companylogo-4.png", "/images/companylogo-5.png"];
    const row2 = ["/images/companylogo-6.png", "/images/companylogo-7.png", "/images/companylogo-8.png",
        "/images/companylogo-9.png", "/images/companylogo-10.png", "/images/companylogo-11.png"];
    const row3 = ["/images/companylogo-12.png", "/images/companylogo-13.png", "/images/companylogo-14.png"];

    const cardData = [
        {
            title: "Candidate Sourcing",
            description: "Candidate sourcing is a crucial step in the hiring process, allowing companies to identify and connect with potential candidates before they even apply for a position. This feature enables recruiters to proactively search for talent by leveraging professional networks, resume databases, AI-powered matching algorithms, and targeted outreach campaigns.",
            buttonText: "Find Top Talent"
        },
        {
            title: "Tech Job Posts",
            description: "Technology-related job postings require a different approach than traditional job listings due to the highly competitive nature of the tech industry. This feature ensures that job openings are distrib..."
        },
        {
            title: "Career Events",
            description: "Career events provide a unique opportunity for companies to interact with potential employees in a real-time, engaging environment. This feature supports businesses in organizing and parti..."
        },
        {
            title: "Perm Sourcing",
            description: "Not all hiring needs are permanent, and businesses often require flexibility in workforce management. This feature enables companies to find and onboard both contract-based and..."
        },
    ];

    const testimonials = [
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I’m so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Floyd Miles",
            role: "Product Manager",
            avatar: "/images/clienttest3.png",
            company: { name: "Toughzap", logo: "/images/comptest3.png" },
        },
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I’m so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Floyd Miles",
            role: "Product Manager",
            avatar: "/images/clienttest3.png",
            company: { name: "Toughzap", logo: "/images/comptest3.png" },
        },
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I’m so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Floyd Miles",
            role: "Product Manager",
            avatar: "/images/clienttest3.png",
            company: { name: "Toughzap", logo: "/images/comptest3.png" },
        },
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I’m so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Floyd Miles",
            role: "Product Manager",
            avatar: "/images/clienttest3.png",
            company: { name: "Toughzap", logo: "/images/comptest3.png" },
        },
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I’m so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Floyd Miles",
            role: "Product Manager",
            avatar: "/images/clienttest3.png",
            company: { name: "Toughzap", logo: "/images/comptest3.png" },
        }
    ];

    return (
        <div className="w-full relative">
            <Hero />
            <div className="mt-6 mb-24 p-4 flex flex-col items-center sm:mx-6 md:mx-9 lg:mx-28 xl:mx-auto max-w-[1315px]">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-4xl font-medium text-center mb-3">Trused by 2K companies</h1>
                    <p className="text-xs sm:text-base text-center text-[#757575]">Comments from companies that have hired you</p>
                </div>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <RatingCard
                        title="Review"
                        value="1M"
                        chartData={reviewData}
                        lineColor="#005DDC"
                        fillColor="rgba(115, 137, 255, 0.2)"
                    />
                    <RatingCard
                        title="Rating"
                        value="4.6"
                        chartData={ratingData}
                        lineColor="#00AEAE" // Green line
                        fillColor="rgba(0, 174, 174, 0.2)" // Pale green fill
                    />
                    <RatingCard
                        title="Company"
                        value="2K"
                        chartData={companyData}
                        lineColor="#009E00" // Orange-red line
                        fillColor="rgba(0, 158, 0, 0.2)" // Peach puff fill
                    />
                </div>
            </div>

            <div className="mt-6 mb-24 p-4 sm:mx-6 md:mx-9 lg:m-0">
                <div className="mb-6 flex flex-col items-center">
                    <h1 className="text-2xl sm:text-4xl font-medium text-center mb-3">
                        Built for companies of all sizes
                    </h1>
                    <p className="text-xs sm:text-base text-center text-[#757575] w-full max-w-[450px]">
                        "We’re the best one platform that connects you straight to the person who knows your job inside out."
                    </p>
                </div>

                <div className="flex justify-center gap-3 sm:gap-6 mb-6">
                    <button className="w-full max-w-[215px] py-2 px-4 bg-[#222222] text-white rounded-lg cursor-pointer hover:bg-[#282828] font-medium text-xs sm:text-base">
                        Join for free
                    </button>
                    <button className="w-full max-w-[215px] py-2 px-4 rounded-lg text-[#222222] border border-[#222222] cursor-pointer flex items-center justify-center font-medium gap-2 text-xs sm:text-base">
                        See our plans <ChevronRight className="h-4 w-4 mt-1" />
                    </button>
                </div>

                {/* Logos Section */}
                <div>
                    {/* Mobile & Tablet: Ticker */}
                    <div className="lg:hidden overflow-hidden w-full py-4 hover:cursor-pointer">
                        <Marquee pauseOnHover={true} gradient={false} speed={40}>
                            {[...row1, ...row2, ...row3].map((src, i) => (
                                <div key={i} className="px-2">
                                    <CompanyLogo src={src} size="w-40 h-10" />
                                </div>
                            ))}
                        </Marquee>
                    </div>

                    {/* Desktop: 3 Rows */}
                    <div className="hidden lg:block w-full mx-auto py-6 space-y-4">
                        {/* Row 1 (5 logos) */}
                        <div className="mx-auto xl:max-w-[1024px] lg:max-w-[768px] flex justify-center gap-4">
                            {row1.map((src, i) => (
                                <div key={i}>
                                    <CompanyLogo src={src} size="w-full lg:h-12 xl:h-16" />
                                </div>
                            ))}
                        </div>

                        {/* Row 2 (6 logos) */}
                        <div className="mx-auto xl:max-w-[1280px] lg:max-w-[1024px] flex justify-center gap-4">
                            {row2.map((src, i) => (
                                <div key={i}>
                                    <CompanyLogo src={src} size="w-full lg:h-12 xl:h-16" />
                                </div>
                            ))}
                        </div>

                        {/* Row 3 (3 logos) */}
                        <div className="mx-auto xl:max-w-[768px] lg:max-w-[640px] flex justify-center gap-4">
                            {row3.map((src, i) => (
                                <div key={i}>
                                    <CompanyLogo src={src} size="w-full lg:h-12 xl:h-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 mb-24 p-4">
                <div className="mb-6 flex flex-col items-center">
                    <h1 className="text-2xl sm:text-4xl font-medium text-center mb-3">Efficient solutions for hiring success</h1>
                    <p className="text-xs sm:text-base text-center text-[#757575] w-full max-w-[450px]">"Optimize your recruitment with powerful tools for search, performance, efficiency, and visibility"</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:mx-1 md:mx-9 lg:mx-26 xl:mx-auto max-w-[1280px]">
                    <SolutionsCard
                        image="/images/solution1.png"
                        title="Robust Resume Search"
                        description="Sponser your work to make sure the right people see it."
                    />
                    <SolutionsCard
                        image="/images/solution2.png"
                        title="Flexible and Performance"
                        description="Sponser your work to make sure the right people see it."
                    />
                    <SolutionsCard
                        image="/images/solution3.png"
                        title="Efficient Recruiting Process"
                        description="Sponser your work to make sure the right people see it."
                    />
                    <SolutionsCard
                        image="/images/solution4.png"
                        title="Increase your visibility"
                        description="Sponser your work to make sure the right people see it."
                    />
                </div>
            </div>

            <div className="mt-6 mb-24 p-4 sm:mx-2 md:mx-5 lg:mx-24 xl:mx-auto max-w-[1350px]">
                <div className="mb-6 flex flex-col items-center">
                    <h1 className="text-2xl sm:text-4xl font-medium text-center mb-3">Elevate your hiring strategy</h1>
                    <p className="text-xs sm:text-base text-center text-[#757575] w-full max-w-[450px]">"Treamline your recruitment process with innovative solutions for sourcing, job posts, career events, and flexible hiring"</p>
                </div>
                <div className="mt-12 sm:p-4">
                    {/* Hiring strategy cards block */}
                    <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
                        {/* First card - wider on lg, has the button (pass buttonText only here) */}
                        <div className="w-full lg:w-[30%]">
                            <HiringStrategyCard
                                title={cardData[0].title}
                                description={cardData[0].description}
                                buttonText={cardData[0].buttonText} // button only on first card
                            />
                        </div>

                        {/* Remaining three cards - equal width on lg, stacked on mobile */}
                        <div className="w-full space-y-6 lg:space-y-0 lg:flex lg:flex-1 lg:gap-6">
                            {cardData.slice(1).map((card, i) => (
                                <div key={i} className="w-full lg:flex-1 min-w-0">
                                    <HiringStrategyCard
                                        title={card.title}
                                        description={card.description}
                                    // no buttonText => no button rendered
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 mb-12 p-4">
                <div className="mb-6 flex flex-col items-center">
                    <h1 className="text-2xl sm:text-4xl font-medium text-center mb-3">The result are in - Our clients win</h1>
                    <p className="text-xs sm:text-base text-center text-[#757575] w-full max-w-[450px]">"The proof is in the partnerships, Here’s why companies choose power to fly  for building engaged and inclusive workforces."</p>
                </div>
                <TestimonialSlider testimonials={testimonials} />
            </div>

            <PlansSection />
        </div>
    );
};

export default page;