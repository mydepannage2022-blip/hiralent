"use client";

import { useState } from "react";
import { SkillsSectionProps, SkillCategory } from "@/src/types/profile";
import { Shield, Star, Filter, Award, TrendingUp, Code2, Sparkles } from "lucide-react";

export default function ProfessionalSkillsSection({ skills }: SkillsSectionProps) {
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
            { key: 'all' as const, label: 'All Skills', count: skills.length, icon: Sparkles },
            { key: 'technical' as const, label: 'Technical', count: categoryCounts.technical || 0, icon: Code2 },
            { key: 'soft' as const, label: 'Soft Skills', count: categoryCounts.soft || 0, icon: TrendingUp },
            { key: 'language' as const, label: 'Languages', count: categoryCounts.language || 0, icon: Award },
            { key: 'certification' as const, label: 'Certifications', count: categoryCounts.certification || 0, icon: Shield },
        ].filter(cat => cat.count > 0);
    };

    const categories = getSkillCategories();
    const verifiedCount = skills.filter(skill => skill.is_verified).length;

    // Enhanced proficiency color with gradients
    const getProficiencyStyle = (proficiency: string) => {
        switch (proficiency) {
            case 'expert': 
                return {
                    badge: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                    border: 'border-purple-200',
                    glow: 'shadow-purple-100'
                };
            case 'advanced': 
                return {
                    badge: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
                    border: 'border-blue-200',
                    glow: 'shadow-blue-100'
                };
            case 'intermediate': 
                return {
                    badge: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
                    border: 'border-green-200',
                    glow: 'shadow-green-100'
                };
            case 'beginner': 
                return {
                    badge: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white',
                    border: 'border-yellow-200',
                    glow: 'shadow-yellow-100'
                };
            default: 
                return {
                    badge: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
                    border: 'border-gray-200',
                    glow: 'shadow-gray-100'
                };
        }
    };

    // Get proficiency stars with animation
    const getProficiencyStars = (proficiency: string) => {
        const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
        const level = levels[proficiency as keyof typeof levels] || 1;
        return Array.from({ length: 4 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 transition-all duration-300 ${
                    i < level 
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' 
                        : 'text-gray-300'
                }`}
            />
        ));
    };

    if (skills.length === 0) {
        return (
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <Code2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Professional Skills</h2>
                        <p className="text-gray-600">No skills information available yet.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header with Icon */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
                        <Code2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Professional <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Skills</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        A comprehensive overview of technical and professional capabilities, 
                        with verification status and proficiency levels.
                    </p>
                </div>

                {/* Enhanced Stats Summary with Gradients */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <div className="group bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-blue-200">
                        <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                            {skills.length}
                        </div>
                        <div className="text-sm font-medium text-blue-800 mt-1">Total Skills</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-green-200">
                        <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {verifiedCount}
                        </div>
                        <div className="text-sm font-medium text-green-800 mt-1">Verified</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-2xl text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-purple-200">
                        <Award className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {skills.filter(s => s.proficiency === 'expert' || s.proficiency === 'advanced').length}
                        </div>
                        <div className="text-sm font-medium text-purple-800 mt-1">Expert/Advanced</div>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-orange-50 to-amber-100 p-6 rounded-2xl text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-orange-200">
                        <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            {categories.length - 1}
                        </div>
                        <div className="text-sm font-medium text-orange-800 mt-1">Categories</div>
                    </div>
                </div>

                {/* Enhanced Filters with Icons */}
                <div className="flex flex-col lg:flex-row gap-6 mb-12 items-center justify-between">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        {categories.map(category => {
                            const Icon = category.icon;
                            return (
                                <button
                                    key={category.key}
                                    onClick={() => setActiveCategory(category.key)}
                                    className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                        activeCategory === category.key
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${
                                        activeCategory === category.key 
                                            ? 'text-white' 
                                            : 'text-gray-500 group-hover:text-blue-600'
                                    }`} />
                                    {category.label}
                                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                        activeCategory === category.key
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                                    }`}>
                                        {category.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Verification Toggle */}
                    {verifiedCount > 0 && (
                        <button
                            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                showVerifiedOnly
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-green-300 hover:shadow-md'
                            }`}
                        >
                            <Shield className="w-5 h-5" />
                            Verified Only
                            {showVerifiedOnly && (
                                <span className="ml-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                            )}
                        </button>
                    )}
                </div>

                {/* Enhanced Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSkills.map((skill, index) => {
                        const proficiencyStyle = getProficiencyStyle(skill.proficiency);
                        
                        return (
                            <div
                                key={index}
                                className={`group bg-white border-2 ${proficiencyStyle.border} rounded-2xl p-6 hover:shadow-2xl hover:${proficiencyStyle.glow} transition-all duration-300 hover:-translate-y-2 relative overflow-hidden`}
                            >
                                {/* Animated Background Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Skill Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                                {skill.skill_name}
                                            </h3>
                                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold capitalize shadow-sm ${proficiencyStyle.badge}`}>
                                                {skill.proficiency}
                                            </span>
                                        </div>
                                        
                                        {/* Verification Badge */}
                                        {skill.is_verified && (
                                            <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-md">
                                                <Shield className="w-4 h-4" />
                                                <span className="text-xs font-bold">Verified</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Proficiency Stars */}
                                    <div className="flex items-center gap-1.5 mb-4 pb-4 border-b border-gray-100">
                                        {getProficiencyStars(skill.proficiency)}
                                        <span className="text-xs text-gray-500 ml-2 capitalize font-medium">
                                            {skill.proficiency} Level
                                        </span>
                                    </div>

                                    {/* Experience & Category Info */}
                                    <div className="space-y-3">
                                        {skill.years_experience !== undefined && skill.years_experience > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 font-medium">Experience</span>
                                                <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                                                    {skill.years_experience} year{skill.years_experience !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 font-medium">Category</span>
                                            <span className="font-bold text-gray-900 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg capitalize">
                                                {skill.skill_category.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Enhanced No Results State */}
                {filteredSkills.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                        <Filter className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-gray-900 mb-3">No Skills Found</h3>
                        <p className="text-gray-600 mb-6">
                            No skills match your current filters. Try adjusting your selection.
                        </p>
                        <button
                            onClick={() => {
                                setActiveCategory('all');
                                setShowVerifiedOnly(false);
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <Filter className="w-4 h-4" />
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}