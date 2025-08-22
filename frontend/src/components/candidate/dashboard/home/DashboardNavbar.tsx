import React from 'react'
import { CiSearch } from 'react-icons/ci';
import { IoIosNotificationsOutline } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { HiCheckBadge } from 'react-icons/hi2'; // Verified icon
import { HiExclamationTriangle } from 'react-icons/hi2'; // Not verified icon
import { useAuth } from '../../../../context/AuthContext';
import { useProfile } from '../../../../context/ProfileContext'; // ✅ Added profile context
import { useRouter, usePathname } from 'next/navigation';
import SmartLink from '../../../layout/SmartLink';

interface DashboardNavbarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ 
  isMobileMenuOpen = false, 
  setIsMobileMenuOpen = () => {} 
}) => {
  const { user } = useAuth(); // ✅ Only for user info (name, email verification)
  const { profileData } = useProfile(); // ✅ For profile data (picture, headline)
  const router = useRouter();
  const pathname = usePathname();

  const handleNotificationClick = () => {
    router.push('/candidate/dashboard/notifications');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search submitted');
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // ✅ Updated: Get profile picture from profile context
  const getProfileImage = () => {
    if (profileData?.profile_picture_url) {
      return profileData.profile_picture_url;
    }
    return "/images/candidate.jpg";
  };

  // ✅ Updated: Get user headline with email fallback
  const getUserHeadlineOrEmail = () => {
    // First try headline from profile context
    if (profileData?.headline) {
      return profileData.headline;
    }
    // Fallback to email from auth context
    if (user?.email) {
      return user.email;
    }
    return 'Professional seeking new opportunities';
  };

  // Check if user is verified (from auth context)
  const isEmailVerified = () => {
    return user?.is_email_verified || false;
  };

  // Get verification icon
  const getVerificationIcon = () => {
    if (isEmailVerified()) {
      return (
        " "
      );
    } else {
      return (
        <SmartLink href='/auth/verify-email' >
          <HiExclamationTriangle 
            className="w-3 h-3 text-orange-500 flex-shrink-0" 
            title="Email Not Verified"
          />
        </SmartLink>
      );
    }
  };

  // Dynamic page titles and descriptions based on pathname
  const getPageInfo = () => {
    switch (pathname) {
      case '/candidate/dashboard':
        return {
          title: 'Dashboard',
          description: 'Updating your information will offer you the most relevant content'
        };
      case '/candidate/dashboard/candidate-profile':
        return {
          title: 'Profile',
          description: 'Manage and update your professional profile information'
        };
      case '/candidate/dashboard/messages':
        return {
          title: 'Messages',
          description: 'View and manage your conversations with employers'
        };
      case '/candidate/dashboard/notifications':
        return {
          title: 'Notifications',
          description: 'Stay updated with important alerts and updates'
        };
      case '/candidate/dashboard/settings':
        return {
          title: 'Settings',
          description: 'Customize your account preferences and privacy settings'
        };
      case '/candidate/dashboard/analytics':
        return {
          title: 'Analytics',
          description: 'Track your job search progress and performance metrics'
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Updating your information will offer you the most relevant content'
        };
    }
  };

  const { title, description } = getPageInfo();

  return (
    <div className='w-full flex flex-col sm:flex-row justify-start items-start sm:items-center text-[#282828] gap-4 sm:gap-0'>
      {/* Title Section with Mobile Menu */}
      <div className='w-full sm:w-1/2 lg:w-1/3 xl:w-1/2 flex items-center gap-3'>
        {/* Mobile Hamburger Menu - Only visible on mobile */}
        <button
          onClick={handleMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <HiOutlineMenuAlt3 className="text-2xl text-[#353535]" />
        </button>

        <div className="flex-1">
          <h3 className='font-bold text-lg sm:text-xl lg:text-xl xl:text-2xl'>{title}</h3>
          <p className='font-light text-xs sm:text-xs xl:text-sm text-[#515151] hidden sm:block'>{description}</p>
        </div>
      </div>

      {/* Right Section */}
      <div className='w-full sm:w-1/2 lg:w-2/3 xl:w-1/2 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 lg:gap-8'>
        
        {/* Search Form */}
        <form 
          onSubmit={handleSearchSubmit}
          className='flex justify-between items-center bg-white p-2 sm:p-3 rounded-lg w-full sm:w-2/3 lg:w-2/3'
        >
          <input 
            type="text" 
            name="Search" 
            placeholder='Search' 
            className='outline-none text-sm sm:text-base w-full'
          />
          <button type="submit" className="cursor-pointer">
            <CiSearch className='text-xl sm:text-2xl hover:text-gray-600 transition-colors'/>
          </button>
        </form>

        {/* Notification Icon */}
        <button
          onClick={handleNotificationClick}
          className="cursor-pointer hover:text-gray-600 transition-colors"
        >
          <IoIosNotificationsOutline className='text-2xl sm:text-3xl lg:text-4xl xl:text-2xl'/>
        </button>
        
        {/* User Profile Section */}
        <div className='flex justify-center items-center gap-2'>
          <img 
            src={getProfileImage()} 
            alt="User Image" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all"
          />
          <div className='hidden lg:hidden xl:flex flex-col justify-center items-start'>
            {/* User Name with Verification Icon */}
            <div className='flex items-center gap-1'>
              <h3 className='text-[#222] text-sm lg:text-base'>
                {user?.full_name || 'Guest User'}  
              </h3>
              {/* Verification Icon */}
              {getVerificationIcon()}
            </div>
            
            {/* Headline or Email */}
            <span className='text-xs lg:text-sm text-[#A5A5A5] max-w-48 truncate' title={getUserHeadlineOrEmail()}>
              {getUserHeadlineOrEmail()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardNavbar