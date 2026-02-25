import SmartLink from "../../../../layout/SmartLink";
import React, { useState } from "react";
import { useAuth } from "../../../../../context/AuthContext";
import { useProfileCompleteness } from "../../../../../lib/profile/profile.queries";
import { useProfile } from "../../../../../context/ProfileContext";

const DashboardProfilePercentage = () => {
  const { user } = useAuth();
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useProfileCompleteness();
  const { profileCompleteness, profileData: contextProfileData } = useProfile(); // ✅ Added profileData from context
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  // ✅ Updated: Get profile picture from profile context instead of auth
  const getProfileImage = () => {
    if (contextProfileData?.profile_picture_url) {
      return contextProfileData.profile_picture_url;
    }
    return "/images/candidate.jpg";
  };

  // Get completion percentage - prioritize context data (original logic)
  const getCompletionPercentage = () => {
    // First try from context (saved data)
    if (profileCompleteness?.data?.overall_score !== undefined) {
      return profileCompleteness.data.overall_score;
    }

    // Fallback to direct data
    if (profileData?.data?.overall_score !== undefined) {
      return profileData.data.overall_score;
    }

    return 0;
  };

  // Get missing fields and suggestions with proper typing
  const getProfileData = () => {
    const data = profileCompleteness?.data || profileData?.data;
    return {
      missingFields: (data?.missing_fields || []) as string[],
      suggestions: (data?.suggestions || []) as string[],
    };
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="w-full flex justify-start  items-start bg-white lg:p-4 xl:p-8 rounded-xl lg:gap-2 xl:gap-8 text-[#222]">
        <div className="animate-pulse flex space-x-4 w-full">
          <div className="rounded-full bg-gray-300 h-24 w-24"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full flex justify-start items-start bg-white lg:p-4 xl:p-8 rounded-xl lg:gap-2 xl:gap-8 text-[#222]">
        <div className="text-red-500 text-center w-full">
          <p>Failed to load profile data</p>
          <button
            onClick={() => refetch()}
            className="text-[#005DDC] underline text-sm mt-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();
  const { missingFields, suggestions } = getProfileData();

  return (
    <div className="w-full relative">
      <div
        className="w-full flex justify-start sm:justify-between flex-col sm:flex-row items-start p-6 bg-white lg:p-4 xl:p-8 rounded-xl lg:gap-2 xl:gap-4 text-[#222] cursor-pointer transition-all duration-200 hover:shadow-lg"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="hidden sm:block">
          <img
            src={getProfileImage()}
            alt="User Profile"
            className="w-30 h-30 rounded-full object-cover"
          />
        </div>
        <div className="flex flex-col lg:flex-row lg:justify-start gap-8 w-3/4">
          <div className="flex flex-col justify-start items-start gap-1 flex-1">
            <h2 className="font-bold lg:text-sm xl:text-xl">
              <span className="text-[#005DDC]">{completionPercentage}%</span> of
              Your Profile is Complete
            </h2>
            <p className="font-light text-xs text-[#757575]">
              {completionPercentage >= 80
                ? "Great job! Your profile looks complete."
                : completionPercentage >= 50
                ? "Almost there! Just a little more effort to make it perfect."
                : "Complete your profile to get better job matches."}
            </p>
            <div className="w-full h-2 bg-[#CBCBCB] rounded-lg relative overflow-hidden mt-2">
              <div
                className="h-full bg-[#005DDC] rounded-lg absolute top-0 left-0 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            {/* Missing fields preview */}
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missingFields.slice(0, 3).map((field: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                    {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                ))}
                {missingFields.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    +{missingFields.length - 3} more
                  </span>
                )}
              </div>
            )}

            <SmartLink
              href="/candidate/dashboard/candidate-profile"
              className="pt-2 font-medium text-[#005DDC] lg:text-sm xl:text-base hover:underline"
            >
              {completionPercentage >= 80 ? "View Profile →" : "Complete your Profile →"}
            </SmartLink>
          </div>
        </div>

      </div>

      {/* Hover Tooltip */}
      {showTooltip && (missingFields.length > 0 || suggestions.length > 0) && (
        <div className="absolute top-full left-4 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 transition-all duration-300 transform animate-in slide-in-from-top-2">
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"></div>

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-[#222] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Missing Fields
              </h4>
              <div className="space-y-1">
                {missingFields
                  .slice(0, 4)
                  .map((field: string, index: number) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 flex items-center gap-2"
                    >
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      {field
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                  ))}
                {missingFields.length > 4 && (
                  <div className="text-xs text-gray-500 italic">
                    +{missingFields.length - 4} more fields
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#222] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Suggestions
              </h4>
              <div className="space-y-1">
                {suggestions
                  .slice(0, 3)
                  .map((suggestion: string, index: number) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 flex items-start gap-2"
                    >
                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                {suggestions.length > 3 && (
                  <div className="text-xs text-gray-500 italic">
                    +{suggestions.length - 3} more suggestions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete Profile Button */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <SmartLink
              href="/profile"
              className="text-xs text-[#005DDC] font-medium hover:underline"
            >
              Complete Profile →
            </SmartLink>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardProfilePercentage;
