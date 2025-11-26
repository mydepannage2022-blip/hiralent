"use client";

import { useState } from "react";
import { SkillsSectionProps, SkillCategory } from "@/src/types/profile";
import { Shield, Star, Filter } from "lucide-react";

export default function SkillsSection({ skills }: SkillsSectionProps) {
    const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all');
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

    // Filter skills based on category and verification
    const filteredSkills = skills.filter(skill => {
        const categoryMatch = activeCategory === 'all' || skill.skill_category === activeCategory;
        const verificationMatch = !showVerifiedOnly || skill.is_verified;
        return categoryMatch && verificationMatch;
    });

    // Get skill categories with counts
    const getSkillCategories = () => {
        const categoryCounts = skills.reduce((acc, skill) => {
            acc[skill.skill_category] = (acc[skill.skill_category] || 0) + 1;
            return acc;
        }, {} as Record<SkillCategory, number>);

        return [
            { key: 'all' as const, label: 'All Skills', count: skills.length },
            { key: 'technical' as const, label: 'Technical', count: categoryCounts.technical || 0 },
            { key: 'soft' as const, label: 'Soft Skills', count: categoryCounts.soft || 0 },
            { key: 'language' as const, label: 'Languages', count: categoryCounts.language || 0 },
            { key: 'certification' as const, label: 'Certifications', count: categoryCounts.certification || 0 },
        ].filter(cat => cat.count > 0);
    };

    const categories = getSkillCategories();
    const verifiedCount = skills.filter(skill => skill.is_verified).length;

    // Get proficiency color
    const getProficiencyColor = (proficiency: string) => {
        switch (proficiency) {
            case 'expert': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'advanced': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'intermediate': return 'bg-green-100 text-green-800 border-green-200';
            case 'beginner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get proficiency stars
    const getProficiencyStars = (proficiency: string) => {
        const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
        const level = levels[proficiency as keyof typeof levels] || 1;
        return Array.from({ length: 4 }, (_, i) => (
            <Star
                key={i}
                className={`w-3 h-3 ${
                    i < level ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
            />
        ));
    };

    if (skills.length === 0) {
        return (
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Skills & Expertise</h2>
                        <p className="text-gray-600">No skills information available yet.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Skills & Expertise</h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        A comprehensive overview of technical and professional capabilities, 
                        with verification status and proficiency levels.
                    </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{skills.length}</div>
                        <div className="text-sm text-blue-800">Total Skills</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
                        <div className="text-sm text-green-800">Verified</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {skills.filter(s => s.proficiency === 'expert' || s.proficiency === 'advanced').length}
                        </div>
                        <div className="text-sm text-purple-800">Expert/Advanced</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">{categories.length - 1}</div>
                        <div className="text-sm text-orange-800">Categories</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map(category => (
                            <button
                                key={category.key}
                                onClick={() => setActiveCategory(category.key)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    activeCategory === category.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {category.label} ({category.count})
                            </button>
                        ))}
                    </div>

                    {/* Verification Filter */}
                    {verifiedCount > 0 && (
                        <button
                            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                showVerifiedOnly
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Shield className="w-4 h-4" />
                            Verified Only
                        </button>
                    )}
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSkills.map((skill, index) => (
                        <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            {/* Skill Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        {skill.skill_name}
                                    </h3>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                        getProficiencyColor(skill.proficiency)
                                    }`}>
                                        {skill.proficiency}
                                    </span>
                                </div>
                                
                                {/* Verification Badge */}
                                {skill.is_verified && (
                                    <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        <Shield className="w-3 h-3" />
                                        <span className="text-xs font-medium">Verified</span>
                                    </div>
                                )}
                            </div>

                            {/* Proficiency Stars */}
                            <div className="flex items-center gap-1 mb-3">
                                {getProficiencyStars(skill.proficiency)}
                                <span className="text-xs text-gray-500 ml-2 capitalize">
                                    {skill.proficiency}
                                </span>
                            </div>

                            {/* Experience & Category */}
                            <div className="space-y-2 text-sm text-gray-600">
                                {skill.years_experience && (
                                    <div className="flex justify-between">
                                        <span>Experience:</span>
                                        <span className="font-medium">
                                            {skill.years_experience} year{skill.years_experience !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Category:</span>
                                    <span className="font-medium capitalize">
                                        {skill.skill_category.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results */}
                {filteredSkills.length === 0 && (
                    <div className="text-center py-12">
                        <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                            No skills found with the current filters.
                        </p>
                        <button
                            onClick={() => {
                                setActiveCategory('all');
                                setShowVerifiedOnly(false);
                            }}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}