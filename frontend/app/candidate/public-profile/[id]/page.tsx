"use client";

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '@/src/lib/profile/profile.api';
import Hero from "@/src/components/candidate/public-profile/Hero";
import SkillsSection from '@/src/components/candidate/public-profile/Skillssection';
import ExperienceSection from '@/src/components/candidate/public-profile/Experiencesection';
import EducationSection from '@/src/components/candidate/public-profile/Educationsection';
import LogosStrip from "@/src/components/candidate/public-profile/LogosStrip";
import TestimonialSlider from "@/src/components/company/home/TestimonialSlider";
import BlogSection from '@/src/components/company/public-profile/Blog';
import { PublicProfileData } from '@/src/types/profile';

export default function PublicProfilePage() {
    const params = useParams();
    const candidateId = params.id as string;
    

      console.log('🔍 Page mounted');
    console.log('🆔 candidateId:', candidateId);
    console.log('🔄 candidateId exists:', !!candidateId);

    const { data: profileResponse, isLoading, error } = useQuery({
        queryKey: ['public-profile', candidateId],
        queryFn: () => getPublicProfile(candidateId),
        enabled: !!candidateId,
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#EFF5FF]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading profile...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !profileResponse?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#EFF5FF]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
                    <p className="text-gray-600 mb-6">The candidate profile you're looking for doesn't exist or has been removed.</p>
                    <button 
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const profile: PublicProfileData = profileResponse.data;

    // Parse JSON strings
    const experience = profile.experience ? JSON.parse(profile.experience) : [];
    const education = profile.education ? JSON.parse(profile.education) : [];
    const languages = profile.languages ? JSON.parse(profile.languages) : [];
    const links = profile.links ? JSON.parse(profile.links) : [];

    // Testimonials data (static for now)
    const testimonials = [
        {
            description: "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
            name: "Albert Flores",
            role: "HR Manager",
            avatar: "/images/clienttest1.png",
            company: { name: "Warephase", logo: "/images/comptest1.png" },
        },
        {
            description: "I'm so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
            name: "Jane Cooper",
            role: "Product Manager",
            avatar: "/images/clienttest2.png",
            company: { name: "Iselectrics", logo: "/images/comptest2.png" },
        },
        {
            description: "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
            name: "Dianne Russell",
            role: "Software Engineer",
            avatar: "/images/clienttest3.png",
            company: { name: "TechCorp", logo: "/images/comptest3.png" },
        },
    ];

    return (
        <main className="bg-white">
            {/* Hero Section with Profile Data */}
            <Hero profile={profile} />
            
            {/* Logos Strip */}
            <LogosStrip />
            
            {/* Skills Section */}
            <SkillsSection skills={profile.skills} />
            
            {/* Experience & Education */}
            <div className="py-8 sm:py-16 bg-gray-50">
                <div className="max-w-[400px] sm:max-w-[740px] md:max-w-[970px] lg:max-w-[1090px] xl:max-w-[1345px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
                        <ExperienceSection experience={experience} />
                        <EducationSection education={education} />
                    </div>
                </div>
            </div>
            
            {/* Languages & Links */}
            {(languages.length > 0 || links.length > 0) && (
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Languages */}
                            {languages.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Languages</h3>
                                    <div className="grid gap-4">
                                        {languages.map((lang: any, index: number) => (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-900">{lang.language}</span>
                                                    <span className="text-sm text-gray-600 capitalize">{lang.proficiency}</span>
                                                </div>
                                                {lang.notes && (
                                                    <p className="text-sm text-gray-600 mt-2">{lang.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Social Links */}
                            {links.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Links</h3>
                                    <div className="grid gap-4">
                                        {links.map((link: any, index: number) => (
                                            <a 
                                                key={index}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-900">{link.platform}</span>
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{link.display_name || link.url}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Testimonials */}
            <div className="py-0 sm:py-16 bg-gray-50">
                <div className="max-w-[1345px] mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-0 sm:mb-12">What People Say</h2>
                    <TestimonialSlider testimonials={testimonials} />
                </div>
            </div>
            
            {/* Blog Section */}
            <BlogSection />
        </main>
    );
}