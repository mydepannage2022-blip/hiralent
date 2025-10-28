'use client'
import React, { use } from "react";
import CompanyDetailsCard from '@/src/components/job/jobdetails/CompanyDetailsCard';
import { ChevronRight } from 'lucide-react';
import JobCard from '@/src/components/company/public-profile/JobCard';
interface JobDetailsPageProps {
    params: Promise<{ id: string }>;
}
const JobDetailsPage = ({ params }: JobDetailsPageProps) => {
    const { id } = use(params);
    // Mock data (replace with API fetch using id later)
    const companyData = {
        name: 'Figma',
        logo: '/images/companyicon.png',
        role: 'UI/UX Designer',
        shortDescription:
            'A Senior UX Designer is a pivotal member of product development teams, responsible for ensuring that digital',
        employmentType: 'Full-Time',
        experienceLevel: '2-3 Years',
        location: 'Los Angeles, CA',
        salary: '$500',
        profileImage: '/images/candidate.png',
        resumeProgress: '5%',
        resumeMessage:
            'Almost there! Just a little more effort to make it perfect.',
    };
    return (
        <div className="sm:mt-40 mt-30 mb-20">
            <div className="mx-4 sm:mx-10 md:mx-13 lg:mx-32 xl:mx-20">
                <CompanyDetailsCard {...companyData} />
                <div className="w-full mx-auto bg-white space-y-6 mt-12">
                    {/* Overview */}
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Overview</h2>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            A Senior UX Designer is a pivotal member of product development teams,
                            responsible for ensuring that digital products and applications
                            provide users with intuitive, efficient, and enjoyable interactions.
                            They use a combination of research, thinking, and user empathy to
                            inform their decisions, with the ultimate goal of delivering a
                            seamless and satisfying user experience.
                        </p>
                    </div>
                    {/* Job Description */}
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Job Description</h2>
                        <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                            <li>Develop precise user flows and wireframes.</li>
                            <li>
                                Create prototypes and conduct usability tests to address user
                                challenges.
                            </li>
                            <li>Adhere to design system guidelines.</li>
                            <li>
                                Investigate optimal methods for generating thorough documentation.
                            </li>
                            <li>
                                Offer guidance and mentorship to junior team members for optimal
                                design execution.
                            </li>
                            <li>
                                Act as a consultant for fellow UX Designers within at least 3
                                different groups or teams.
                            </li>
                        </ul>
                    </div>
                    {/* What we offer */}
                    <div>
                        <h2 className="text-xl font-semibold mb-2">What we offer</h2>
                        <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                            <li>Competitive compensation package</li>
                            <li>Convenient office location in the Copenhagen Area</li>
                            <li>Significant responsibilities and autonomy</li>
                            <li>
                                Participation in a well-funded startup poised for international
                                growth
                            </li>
                            <li>
                                Collaborative work environment with an experienced team for learning
                                and development
                            </li>
                            <li>
                                Joining a tight-knit, personable, and friendly team
                            </li>
                            <li>
                                Prospects for increased responsibilities in tandem with the
                                company's expansion
                            </li>
                        </ul>
                    </div>
                    {/* Bottom Tags */}
                    <div className="flex flex-wrap gap-2 pt-4">
                        {[
                            "Contract",
                            "Remote",
                            "Full-time",
                            "Entry level",
                            "0-1 years experience",
                        ].map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-gray-100 text-gray-600"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold">
                            About Company
                        </h2>
                        <a href="#" className="text-[#005DDC] font-semibold inline-flex items-center gap-3">
                            More
                            <ChevronRight
                                className="w-4 h-4 text-[#005DDC] relative top-[1px]"
                            />
                        </a>
                    </div>
                    <p className="text-gray-700">
                        Slack Technologies, Inc. is a prominent software company headquartered in San Francisco, California. Founded in 2009 by Stewart Butterfield, Eric Costello, Cal Henderson, and Serguei Mourachov, the company has revolutionized team communication and collaboration with its innovative platform, Slack.
                        Slack offers various subscription plans to cater to the needs of different businesses, from small startups to large enterprises. These plans include free, standard, plus, and enterprise versions, each with its own set of features and capabilities. Since its official launch in 2013, Slack has experienced remarkable growth and adoption across various industries...
                    </p>
                    {/* Jobs Section */}
                    <div className="pt-6 sm:pt-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold">
                                Similar jobs
                            </h2>
                            <a href="#" className="text-[#005DDC] font-semibold inline-flex items-center gap-3">
                                More
                                <ChevronRight
                                    className="w-4 h-4 text-[#005DDC] relative top-[1px]"
                                />
                            </a>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <JobCard
                                logo="/images/jobco16.png"
                                company="UI/UX Designer"
                                title="Conn Group"
                                types={["Full-Time", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/jobco7.png"
                                company="UI/UX Designer"
                                title="Schumm and Sons"
                                types={["Full-Time", "Part-Time"]}
                                location="Andra Pradesh"
                                salary="25 $ / Month"
                                postedTime="1 hours ago"
                            />
                            <JobCard
                                logo="/images/jobco13.png"
                                company="Marvin and Sons"
                                title="UI/UX Designer"
                                types={["Mid-Level", "Part-Time"]}
                                location="Tamil Nadu"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/jobco9.png"
                                company="Schumm-Cormier"
                                title="UI/UX Designer"
                                types={["Full-Time", "Senior"]}
                                location="Kerala"
                                salary="25 $ / Month"
                                postedTime="1 hour ago"
                            />
                            <JobCard
                                logo="/images/jobco8.png"
                                company="Ritchie LLC"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Kerala"
                                salary="25 55$ / Month"
                                postedTime="1 hours ago"
                            />
                            <JobCard
                                logo="/images/jobco17.png"
                                company="Runte, Flatley and Miller"
                                title="UI/UX Designer"
                                types={["Full-Time", "Part-Time"]}
                                location="Andra Pradesh"
                                salary="25 35$ / Month"
                                postedTime="1 hours ago"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default JobDetailsPage;