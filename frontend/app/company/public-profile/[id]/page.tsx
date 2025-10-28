'use client'

import React, { use } from "react";
import Image from 'next/image';
import CompanyInfoCard from '@/src/components/company/public-profile/CompanyInfoCard';
import Tabs from '@/src/components/company/public-profile/PublicProfileTabs';
import PeopleCard from '@/src/components/company/public-profile/PeopleCard';
import OverviewCard from '@/src/components/company/public-profile/OverviewCard';
import { ChevronRight } from "lucide-react";
import JobCard from '@/src/components/company/public-profile/JobCard';

interface PublicProfilePageProps {
    params: Promise<{ id: string }>;
}

const publicProfile = ({ params }: PublicProfilePageProps) => {
    const { id } = use(params);
    return (
        <div className="text-black">
            <div className="mt-30 md:mt-35 mb-20">
                <div className='mb-12'>
                    {/* Banner */}
                    <div className="relative h-35 sm:h-45 md:h-55 lg:h-75 w-full overflow-hidden">
                        <Image
                            src="/images/publicprofile-banner.png"
                            alt="Company banner"
                            fill
                            className="object-cover"
                        />
                    </div>

                    <div className="relative w-full">
                        {/* Card */}
                        <div className="relative z-10 -mt-10 sm:-mt-12 md:-mt-16 lg:-mt-20 px-4">
                            <CompanyInfoCard
                                logo="/images/bmw-logo.png"
                                name="BMW"
                                website="BMW.com"
                                websiteUrl="https://bmw.com"
                                location="Germany"
                                companySize="1000"
                                email="BMW@gmail.com"
                                phone="+1 98482346"
                            />
                        </div>
                    </div>
                </div>

                <div className="sm:mx-6 md:mx-9 lg:mx-auto px-4 w-full max-w-[1312px]">
                    <Tabs />
                    {/* People Section */}
                    <div className="py-6 sm:py-8 sm:mb-8">
                        <h1 className="text-xl sm:text-3xl font-bold mb-18">People at BMW</h1>
                        {/* Row + column gaps controlled separately */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-12 items-start">
                            <PeopleCard
                                image="/images/people1.png"
                                name="Cameron Williamson"
                                role="Product Analyst"
                                socials={[
                                    { type: 'linkedin', href: '#' },
                                    { type: 'dribbble', href: '#' },
                                    { type: 'instagram', href: '#' },
                                ]}
                            />
                            <PeopleCard
                                image="/images/people2.png"
                                name="Cody Fisher"
                                role="Data Analyst Lead"
                                socials={[
                                    { type: 'linkedin', href: '#' },
                                    { type: 'dribbble', href: '#' },
                                    { type: 'instagram', href: '#' },
                                ]}
                            />
                            <PeopleCard
                                image="/images/people3.png"
                                name="Brooklyn Simmons"
                                role="Senior Interaction Designer"
                                socials={[
                                    { type: 'linkedin', href: '#' },
                                    { type: 'dribbble', href: '#' },
                                    { type: 'instagram', href: '#' },
                                ]}
                            />
                            <PeopleCard
                                image="/images/people4.png"
                                name="Kristin Watson"
                                role="Head of Product Design"
                                socials={[
                                    { type: 'linkedin', href: '#' },
                                    { type: 'dribbble', href: '#' },
                                    { type: 'instagram', href: '#' },
                                ]}
                            />
                            <PeopleCard
                                image="/images/people5.png"
                                name="Darrell Steward"
                                role="Head of Engineering"
                                socials={[
                                    { type: 'linkedin', href: '#' },
                                    { type: 'dribbble', href: '#' },
                                    { type: 'instagram', href: '#' },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Overview Section */}
                    <div className="py-6 sm:py-8 sm:mb-8">
                        <h1 className="text-xl sm:text-3xl font-bold mb-8">Overview</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <OverviewCard
                                name="Leslie Alexander"
                                role="Job Seeker"
                                avatar="/images/avatar1.png"
                                rating={4.5}
                                text="When I sent in my application to Sandro, I was simply hoping for a chance. What I got was a masterclass in how to run a thoughtful, respectful, and inspiring hiring process. From the way they asked questions to the way they listened—every detail reflected."
                                likes={14}
                                dislikes={0}
                            />
                            <OverviewCard
                                name="Wade Warren"
                                role="Job Seeker"
                                avatar="/images/avatar2.png"
                                rating={4.5}
                                text="Taint stood out to me because of their communication and transparency. I always knew where I stood, what the next steps were, and what they were looking for. More importantly, I felt like they truly wanted a two-way dialogue—not just to assess."
                                likes={56}
                                dislikes={1}
                            />
                            <OverviewCard
                                name="Ronald Richards"
                                role="Job Seeker"
                                avatar="/images/avatar3.png"
                                rating={4.5}
                                text="I've always believed that the best companies are the ones that make you feel seen, even before you join them. That was exactly my experience with Taint. The interview wasn't just about evaluating me—it was about helping me evaluate them."
                                likes={65}
                                dislikes={7}
                            />
                        </div>
                    </div>

                    {/* Jobs Section */}
                    <div className="pt-6 sm:pt-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl sm:text-3xl font-bold">
                                Jobs from BMW
                            </h2>
                            <a href="#" className="text-[#005DDC] font-semibold inline-flex items-center gap-3">
                                See all
                                <ChevronRight
                                    className="w-4 h-4 text-[#005DDC] relative top-[1px]"
                                />
                            </a>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="QA Engineer"
                                types={["Part-Time"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="Front-end Developer"
                                types={["Remote"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="3 hours ago"
                            />
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="UI/UX Designer"
                                types={["Part-Time"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="Creative Director"
                                types={["Full-Time"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="Copywriter"
                                types={["Hybrid", "Part-Time"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="6 hours ago"
                            />
                            <JobCard
                                logo="/images/bmw-logo.png"
                                company="BMW"
                                title="Credit-Officer"
                                types={["Mid-Level"]}
                                location="Canada"
                                salary="25 95$ / Month"
                                postedTime="9 hours ago"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default publicProfile;