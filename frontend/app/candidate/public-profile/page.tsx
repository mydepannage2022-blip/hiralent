"use client";

import Hero from "../../../src/components/candidate/public-profile/Hero";
import LogosStrip from "../../../src/components/candidate/public-profile/LogosStrip";
import HiringStrategyCard from "../../../src/components/company/home/HiringStrategyCard";
import TestimonialSlider from "../../../src/components/company/home/TestimonialSlider";
import BlogSection from '../../../src/components/company/public-profile/Blog'

export default function Page() {
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
        <main className="w-full relative">
            <Hero />
            <LogosStrip />
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
            <BlogSection />
        </main>
    );
}