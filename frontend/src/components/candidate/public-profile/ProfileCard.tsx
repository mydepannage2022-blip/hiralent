"use client";

import Image from "next/image";
import { ProfileCardProps } from "@/src/types/profile";
import { MapPin, Calendar, Star, Shield } from "lucide-react";

export default function ProfileCard({ profile }: ProfileCardProps) {
    // Count verified skills
    const verifiedSkillsCount = profile.skills.filter(skill => skill.is_verified).length;
    const totalSkillsCount = profile.skills.length;
    
    // Calculate profile completion percentage
    const calculateCompletionPercentage = () => {
        let completed = 0;
        const totalFields = 8;
        
        if (profile.full_name) completed++;
        if (profile.headline) completed++;
        if (profile.about_me) completed++;
        if (profile.profile_picture_url) completed++;
        if (profile.location || profile.city) completed++;
        if (profile.skills.length > 0) completed++;
        if (profile.experience) completed++;
        if (profile.education) completed++;
        
        return Math.round((completed / totalFields) * 100);
    };

    const completionPercentage = calculateCompletionPercentage();
    
    // Get skill categories count
    const getSkillCategoriesCount = () => {
        const categories = new Set(profile.skills.map(skill => skill.skill_category));
        return categories.size;
    };

    const skillCategoriesCount = getSkillCategoriesCount();

    // Format location
    const getLocationDisplay = () => {
        if (profile.city && profile.location) {
            return `${profile.city}, ${profile.location}`;
        }
        return profile.location || profile.city || 'Location not specified';
    };

    return (
        <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 w-[250px] md:w-[400px] mx-auto">
            {/* Profile Picture */}
            <div className="relative w-12 h-12 sm:w-24 sm:h-24 mx-auto mb-1 sm:mb-4">
                {profile.profile_picture_url ? (
                    <Image
                        src={profile.profile_picture_url}
                        alt={profile.full_name || "Profile"}
                        fill
                        className="rounded-full object-cover"
                        onError={(e) => {
                            // Fallback on error
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                            {profile.full_name?.charAt(0)?.toUpperCase() || 'P'}
                        </span>
                    </div>
                )}
                
                {/* Verification Badge */}
                {verifiedSkillsCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                        <Shield className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>

            {/* Name and Position */}
            <div className="text-center mb-1 sm:mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                    {profile.full_name || 'Professional'}
                </h3>
                <p className="text-sm text-gray-600">
                    {profile.position || 'Professional Developer'}
                </p>
            </div>

            {/* Location */}
            <div className="flex items-center justify-center gap-2 mb-1 sm:mb-4 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{getLocationDisplay()}</span>
            </div>

            {/* Profile Stats */}
            <div className="space-y-1 sm:space-y-3 mb-3 sm:mb-6">
                {/* Profile Completion */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Profile Completed</span>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                            {completionPercentage}%
                        </span>
                    </div>
                </div>

                {/* Skills Count */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Skills</span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                            {totalSkillsCount}
                        </span>
                        {verifiedSkillsCount > 0 && (
                            <span className="text-xs text-green-600">
                                ({verifiedSkillsCount} verified)
                            </span>
                        )}
                    </div>
                </div>

                {/* Skill Categories */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Categories</span>
                    <span className="text-sm font-semibold text-gray-900">
                        {skillCategoriesCount}
                    </span>
                </div>

                {/* Experience Indicator */}
                {profile.experience && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Experience</span>
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-semibold text-gray-900">
                                Professional
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Skills Preview */}
            {profile.skills.length > 0 && (
                <div className="sm:mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 sm:mb-3">Top Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {profile.skills.slice(0, 6).map((skill, index) => (
                            <span
                                key={index}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    skill.is_verified
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                            >
                                {skill.skill_name}
                                {skill.is_verified && (
                                    <Shield className="inline w-3 h-3 ml-1" />
                                )}
                            </span>
                        ))}
                        {profile.skills.length > 6 && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                +{profile.skills.length - 6} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button className="w-full bg-[#005DDC] text-white py-1 px-4 sm:py-3 sm:px-4 rounded-xl font-medium hover:bg-[#0052c4] transition-colors">
                View Full Profile
            </button>

            {/* Contact Info */}
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                    Available for opportunities
                </p>
                {profile.linkedin_url && (
                    <a 
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Connect on LinkedIn
                    </a>
                )}
            </div>
        </div>
    );
}