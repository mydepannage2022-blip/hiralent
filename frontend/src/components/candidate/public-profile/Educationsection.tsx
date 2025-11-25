"use client";

import { EducationSectionProps } from "@/src/types/profile";
import { GraduationCap, Calendar, Award, BookOpen } from "lucide-react";

export default function EducationSection({ education }: EducationSectionProps) {
    if (!education || education.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Education</h3>
                <p className="text-gray-600">No education information available yet.</p>
            </div>
        );
    }

    const sortedEducation = [...education].sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
    });

    const getEducationIcon = (degree: string) => {
        const lowerDegree = degree.toLowerCase();
        if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate')) {
            return <Award className="w-4 h-4 text-purple-600" />;
        }
        if (lowerDegree.includes('master') || lowerDegree.includes('msc') || lowerDegree.includes('mba')) {
            return <GraduationCap className="w-4 h-4 text-blue-600" />;
        }
        if (lowerDegree.includes('bachelor') || lowerDegree.includes('bsc') || lowerDegree.includes('degree')) {
            return <GraduationCap className="w-4 h-4 text-green-600" />;
        }
        if (lowerDegree.includes('diploma') || lowerDegree.includes('certificate') || lowerDegree.includes('certification')) {
            return <Award className="w-4 h-4 text-orange-600" />;
        }
        return <BookOpen className="w-4 h-4 text-gray-600" />;
    };

    const getEducationColor = (degree: string) => {
        const lowerDegree = degree.toLowerCase();
        if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate')) {
            return 'bg-purple-50 border-purple-200';
        }
        if (lowerDegree.includes('master') || lowerDegree.includes('msc') || lowerDegree.includes('mba')) {
            return 'bg-blue-50 border-blue-200';
        }
        if (lowerDegree.includes('bachelor') || lowerDegree.includes('bsc') || lowerDegree.includes('degree')) {
            return 'bg-green-50 border-green-200';
        }
        if (lowerDegree.includes('diploma') || lowerDegree.includes('certificate') || lowerDegree.includes('certification')) {
            return 'bg-orange-50 border-orange-200';
        }
        return 'bg-gray-50 border-gray-200';
    };

    // Calculate education stats
    const degreeCount = education.filter(edu => 
        edu.degree.toLowerCase().includes('degree') || 
        edu.degree.toLowerCase().includes('bachelor') ||
        edu.degree.toLowerCase().includes('master')
    ).length;
    
    const certificationCount = education.filter(edu => 
        edu.degree.toLowerCase().includes('certificate') || 
        edu.degree.toLowerCase().includes('certification') ||
        edu.degree.toLowerCase().includes('diploma')
    ).length;

    const currentlyStudying = education.some(edu => edu.currently_studying);

    return (
        <div className="bg-white rounded-lg p-3 sm:p-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Education</h3>
                <div className="text-right">
                    <div className="text-sm text-gray-600">Qualifications</div>
                    <div className="text-lg font-semibold text-blue-600">
                        {education.length} credential{education.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Education Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center bg-blue-50 rounded-lg p-3">
                    <div className="text-xs sm:text-lg font-bold text-blue-600">{degreeCount}</div>
                    <div className="text-xs text-blue-800">Degrees</div>
                </div>
                <div className="text-center bg-orange-50 rounded-lg p-3">
                    <div className="text-xs sm:text-lg font-bold text-orange-600">{certificationCount}</div>
                    <div className="text-xs text-orange-800">Certificates</div>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-3">
                    <div className="text-xs sm:text-lg font-bold text-green-600">
                        {currentlyStudying ? 'Active' : 'Complete'}
                    </div>
                    <div className="text-xs text-green-800">Status</div>
                </div>
            </div>

            {/* Education Timeline */}
            <div className="space-y-4">
                {sortedEducation.map((edu, index) => (
                    <div key={index} className={`border rounded-lg p-5 ${getEducationColor(edu.degree)}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {getEducationIcon(edu.degree)}
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                        {edu.degree}
                                    </h4>
                                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                                        <GraduationCap className="w-4 h-4" />
                                        <span>{edu.institution}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Year Badge */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                    {edu.year}
                                </span>
                            </div>
                        </div>

                        {/* Education Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Field of Study */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Field:</span>
                                <span className="text-gray-800">{edu.field}</span>
                            </div>

                            {/* Grade */}
                            {edu.grade && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-medium">Grade:</span>
                                    <span className="text-gray-800">{edu.grade}</span>
                                </div>
                            )}

                            {/* Currently Studying */}
                            {edu.currently_studying && (
                                <div className="flex items-center gap-2 col-span-full">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-sm text-green-600 font-medium">
                                        Currently Studying
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Institution Details */}
                        <div className="mt-3 pt-3 border-t border-white/50">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Institution: {edu.institution}</span>
                                <span>Completed: {edu.year}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Education Summary */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    {/* <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div> */}
                    <div>
                        <h4 className="font-semibold text-gray-900">Educational Background</h4>
                        <p className="text-sm text-gray-600">
                            Diverse educational background with {education.length} qualification{education.length !== 1 ? 's' : ''} 
                            spanning multiple disciplines and institutions.
                            {currentlyStudying && ' Currently pursuing additional education.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Field of Study Tags */}
            <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Fields of Study:</h5>
                <div className="flex flex-wrap gap-2">
                    {[...new Set(education.map(edu => edu.field))].map((field, index) => (
                        <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                        >
                            {field}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}