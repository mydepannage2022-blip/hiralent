"use client";

import { ExperienceSectionProps } from "@/src/types/profile";
import { Building2, Calendar, MapPin, ExternalLink } from "lucide-react";

export default function ExperienceSection({ experience }: ExperienceSectionProps) {
    if (!experience || experience.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Work Experience</h3>
                <p className="text-gray-600">No work experience information available yet.</p>
            </div>
        );
    }

    // Calculate total experience
    const calculateTotalExperience = () => {
        const totalYears = experience.reduce((total, exp) => {
            const years = typeof exp.years === 'string' ? parseInt(exp.years) : exp.years;
            return total + (years || 0);
        }, 0);
        return totalYears;
    };

    const totalExperience = calculateTotalExperience();

    return (
        <div className="bg-white rounded-lg p-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Work Experience</h3>
                <div className="text-right">
                    <div className="text-sm text-gray-600">Total Experience</div>
                    <div className="text-lg font-semibold text-blue-600">
                        {totalExperience} year{totalExperience !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Experience Timeline */}
            <div className="space-y-6">
                {experience.map((exp, index) => (
                    <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index !== experience.length - 1 && (
                            <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200 -z-10" />
                        )}
                        
                        <div className="flex gap-4">
                            {/* Timeline dot */}
                            {/* <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-white" />
                            </div> */}
                            
                            {/* Experience Content */}
                            <div className="flex-1 bg-gray-50 rounded-lg p-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                            {exp.job_title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-blue-600 font-medium mb-2">
                                            <Building2 className="w-4 h-4" />
                                            <span>{exp.company}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Duration */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                                        <Calendar className="w-4 h-4" />
                                        <span>{exp.duration}</span>
                                    </div>
                                </div>

                                {/* Experience Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    {/* Years of Experience */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="font-medium">Duration:</span>
                                        <span>
                                            {typeof exp.years === 'string' ? exp.years : exp.years} 
                                            {' '}year{(typeof exp.years === 'string' ? parseInt(exp.years) : exp.years) !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Employment Status */}
                                    {exp.currently_working && (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                            <span className="text-sm text-green-600 font-medium">
                                                Currently Working
                                            </span>
                                        </div>
                                    )}

                                    {/* Date Range */}
                                    {(exp.start_date || exp.end_date) && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {exp.start_date && new Date(exp.start_date).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    year: 'numeric' 
                                                })}
                                                {exp.start_date && exp.end_date && ' - '}
                                                {exp.end_date && new Date(exp.end_date).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    year: 'numeric' 
                                                })}
                                                {exp.currently_working && !exp.end_date && ' - Present'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-gray-700 leading-relaxed">
                                        {exp.description}
                                    </p>
                                </div>

                                {/* Key Achievements or Technologies */}
                                {exp.description.includes('•') && (
                                    <div className="mt-4">
                                        <h5 className="font-medium text-gray-900 mb-2">Key Highlights:</h5>
                                        <div className="text-sm text-gray-700">
                                            {exp.description.split('•').filter(item => item.trim()).map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-2 mb-1">
                                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                                                    <span>{item.trim()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-8 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    {/* <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                    </div> */}
                    <div>
                        <h4 className="font-semibold text-gray-900">Professional Summary</h4>
                        <p className="text-sm text-gray-600">
                            {totalExperience} years of professional experience across {experience.length} position{experience.length !== 1 ? 's' : ''}.
                            Demonstrated expertise in various roles and responsibilities.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}