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
        <div className="flex flex-col lg:flex-row lg:justify-start gap-8">
          <div className="flex flex-col justify-start items-start gap-1">
            <h2 className="font-bold lg:text-sm xl:text-xl">
              <span className="text-[#005DDC]">{completionPercentage}%</span> of
              Your Profile is Complete
            </h2>
            <p className="font-light text-xs">
              {completionPercentage >= 80
                ? "Great job! Your profile looks complete."
                : "Almost there! Just a little more effort to make it perfect."}
            </p>
            <div className="w-full h-2 bg-[#CBCBCB] rounded-lg relative overflow-hidden mt-2">
              <div
                className="h-full bg-[#005DDC] rounded-lg absolute top-0 left-0 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <SmartLink
              href="/candidate/dashboard/candidate-profile"
              className="pt-2 font-light text-[#005DDC] lg:text-sm xl:text-base mb-2"
            >
              Complete your Profile
            </SmartLink>
          </div>
          <div className="flex justify-center items-center gap-4">
            <div className="flex flex-col items-start justify-start gap-2 ring ring-[#EDEDED] p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="27"
                height="26"
                viewBox="0 0 27 26"
                fill="none"
              >
                <path
                  d="M23.3369 11.0174C21.9384 8.67523 18.7994 4.74609 13.5005 4.74609C8.20153 4.74609 5.06253 8.67523 3.66403 11.0174C2.9323 12.2402 2.9323 13.7602 3.66403 14.984C5.06253 17.3262 8.20153 21.2554 13.5005 21.2554C18.7994 21.2554 21.9384 17.3262 23.3369 14.984C24.0686 13.7602 24.0686 12.2412 23.3369 11.0174ZM21.966 14.1639C20.7411 16.2153 18.0112 19.6577 13.5005 19.6577C8.98972 19.6577 6.25983 16.2163 5.03495 14.1639C4.60678 13.446 4.60678 12.5544 5.03495 11.8365C6.25983 9.78513 8.98972 6.34272 13.5005 6.34272C18.0112 6.34272 20.7411 9.78406 21.966 11.8365C22.3952 12.5555 22.3952 13.446 21.966 14.1639ZM13.5005 8.47399C11.0038 8.47399 8.97374 10.5052 8.97374 13.0007C8.97374 15.4963 11.0038 17.5275 13.5005 17.5275C15.9971 17.5275 18.0272 15.4963 18.0272 13.0007C18.0272 10.5052 15.9971 8.47399 13.5005 8.47399ZM13.5005 15.9298C11.8847 15.9298 10.5714 14.6165 10.5714 13.0007C10.5714 11.3849 11.8847 10.0717 13.5005 10.0717C15.1163 10.0717 16.4295 11.3849 16.4295 13.0007C16.4295 14.6165 15.1163 15.9298 13.5005 15.9298Z"
                  fill="#009E00"
                />
              </svg>
              <div className="flex  text-black gap-2">
                <h2 className="">5</h2>
                <p>people</p>
              </div>
              <p className="text-[#757575] font-light lg:text-xs xl:text-sm">
                viewed your profile
              </p>
            </div>

            <div className="flex flex-col items-start justify-start gap-2 ring ring-[#EDEDED] p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="27"
                height="26"
                viewBox="0 0 27 26"
                fill="none"
              >
                <path
                  d="M13.501 23.3853C13.3881 23.3853 13.2751 23.3618 13.1697 23.3139C12.8214 23.1552 4.62432 19.3538 3.30997 12.584C2.80191 9.96484 3.31211 7.40961 4.67439 5.75016C5.77678 4.40599 7.36162 3.69128 9.25859 3.6817C9.26818 3.6817 9.27776 3.6817 9.28629 3.6817C11.4506 3.6817 12.7703 4.91406 13.4999 5.9632C14.2327 4.9098 15.563 3.67211 17.7411 3.6817C19.6392 3.69128 21.2251 4.40599 22.3286 5.75016C23.6887 7.40855 24.1978 9.96375 23.6887 12.585C22.3765 19.3549 14.1783 23.1573 13.8301 23.315C13.7267 23.3619 13.6139 23.3853 13.501 23.3853ZM9.28524 5.27833C9.27885 5.27833 9.27356 5.27833 9.26717 5.27833C7.84205 5.28472 6.71305 5.78424 5.90996 6.76308C4.84591 8.05932 4.46138 10.1214 4.87891 12.2793C5.89609 17.5239 12.0024 20.9323 13.501 21.697C14.9996 20.9323 21.1059 17.5239 22.122 12.2793C22.5417 10.1203 22.1572 8.05825 21.0952 6.76308C20.2921 5.7853 19.1631 5.28682 17.7348 5.27937C17.7284 5.27937 17.722 5.27937 17.7167 5.27937C15.1903 5.27937 14.2945 7.81117 14.2583 7.91875C14.1476 8.24148 13.8428 8.46086 13.502 8.46086C13.4999 8.46086 13.4988 8.46086 13.4977 8.46086C13.1558 8.4598 12.8512 8.24146 12.7426 7.9166C12.7074 7.81009 11.8106 5.27833 9.28524 5.27833Z"
                  fill="#DC0000"
                />
              </svg>
              <div className="flex  text-black gap-2">
                <h2 className="">10</h2>
                <p>people</p>
              </div>
              <p className="text-[#757575] font-light lg:text-xs xl:text-sm">
                liked your profile
              </p>
            </div>
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
