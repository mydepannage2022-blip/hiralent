'use client'

import React from "react"
import SearchBar from "../../../src/components/footer/blog/SearchBar";
import FeaturedPost from "../../../src/components/footer/blog/FeaturedPost";
import BlogSection from "../../../src/components/footer/blog/BlogSection";
import JobBanner from "../../../src/components/footer/blog/JobBanner";
import PeopleCard, { SocialLink } from "../../../src/components/footer/blog/PeopleCard";
import PostCard from "../../../src/components/footer/blog/PostCard";
import Pagination from "../../../src/components/footer/blog/Pagination";

// Blog experts data
const experts: {
    image: string;
    name: string;
    role: string;
    socials?: SocialLink[];
}[] = [
        {
            image: "/images/people1.png",
            name: "Farkas Ágnes",
            role: "Product Analyst",
            socials: [{ type: 'linkedin', href: '#' },
            { type: 'dribbble', href: '#' },
            { type: 'instagram', href: '#' },]
        },
        {
            image: "/images/people2.png",
            name: "Fülöp Kata",
            role: "Data Analyst Lead",
            socials: [{ type: 'linkedin', href: '#' },
            { type: 'dribbble', href: '#' },
            { type: 'instagram', href: '#' },]
        },
        {
            image: "/images/people3.png",
            name: "Surány Izabella",
            role: "Senior Interaction Designer",
            socials: [{ type: 'linkedin', href: '#' },
            { type: 'dribbble', href: '#' },
            { type: 'instagram', href: '#' },]
        },
        {
            image: "/images/people4.png",
            name: "Tóth Kamilla",
            role: "Head of Product Design",
            socials: [{ type: 'linkedin', href: '#' },
            { type: 'dribbble', href: '#' },
            { type: 'instagram', href: '#' },]
        },
        {
            image: "/images/people5.png",
            name: "Savannah Nguyen",
            role: "Head of Engineering",
            socials: [{ type: 'linkedin', href: '#' },
            { type: 'dribbble', href: '#' },
            { type: 'instagram', href: '#' },]
        },
    ];

// All posts data
const posts = [
    {
        image: "/images/allpost1.png",
        title: "When Should You Change Your Job?",
        date: "19 Jan 2025",
        categories: ["Career", "Job Market"],
        description:
            "Knowing when it’s time to move on from your current job is crucial for your career growth. This article helps readers assess whether they’re stuck in a rut or ready for a change. It explores signs that indicate it’s time for a new opportunity, such as lack of career advancement, dissatisfaction with work culture, or burnout. It also provides advice on how to make a smooth transition to a new role, to make a smooth transition to a new roleto make a smooth transition to a new roleto make a smooth transition to a new roleto make a smooth transition to a new roleto make a smooth transition to a new roleto make a smooth tran..."
    },
    {
        image: "/images/allpost2.png",
        title: "How to Keep Your Job During an Economic Crisis?",
        date: "19 Jan 2025",
        categories: ["Career", "Job Market"],
        description:
            "Economic downturns can put job security at risk, but there are ways to protect your position. This article discusses strategies for maintaining your job during a crisis, such as demonstrating adaptability, taking on additional responsibilities, and continuously developing new skills. It also advises on how to stay visible and valuable to your employer during challenging times, employer during challenging timesemployer during challenging timesemployer during challenging timesemployer during challenging timesemployer during challenging timesemployer during challenging timesemployer during challenging timesemployer during challeng..."
    },
    {
        image: "/images/allpost2.png",
        title: "How to Keep Your Job During an Economic Crisis?",
        date: "19 Jan 2025",
        categories: ["Career", "Job Market"],
        description:
            "While technical skills are important, soft skills often make the difference between getting hired and being passed over. This article emphasizes the value of skills like teamwork, problem-solving, communication, and emotional intelligence in the hiring process. It explains how job seekers can highlight these qualities on their resumes and in interviews to make themselves more appealing to employers, ield without direct experience can be challenging, but it’s not impossible. This article provides actionable advice for job seekers looking to land their ield without direct experience can be challengin..."
    }
];

export default function BlogPage() {
    return (
        <main className="px-4 mt-30 md:mt-35 mb-20 w-full max-w-[608px] sm:max-w-[723px] md:max-w-[952px] lg:max-w-[1052px] xl:max-w-[1312px] mx-auto">
            {/* Header + Search */}
            <SearchBar />

            {/* Featured Post */}
            <FeaturedPost />

            {/* Latest Posts */}
            <section className="mt-24 w-full mx-auto">
                <h2 className="text-4xl font-semibold mb-8">The latest Posts</h2>
                <BlogSection />
            </section>

            {/* Banner */}
            <JobBanner />

            {/* Blog Experts */}
            <section className="mt-20 w-full mx-auto">
                <h2 className="text-4xl font-semibold mb-16">Blog experts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-12 items-start">
                    {experts.map((exp, i) => (
                        <PeopleCard
                            key={i}
                            image={exp.image}
                            name={exp.name}
                            role={exp.role}
                            socials={exp.socials}
                        />
                    ))}
                </div>
            </section>

            {/* Viewing All Posts */}
            <section className="mt-24 w-full mx-auto">
                <h2 className="text-4xl font-semibold mb-8">Viewing All Posts</h2>

                <div className="flex flex-col gap-8">
                    {posts.map((p, i) => (
                        <PostCard
                            key={i}
                            image={p.image}
                            title={p.title}
                            description={p.description}
                            date={p.date}
                            categories={p.categories} // ✅ pass categories here
                        />
                    ))}
                </div>

                {/* Pagination */}
                <Pagination totalPages={10} currentPage={1} />
            </section>
        </main>
    );
}