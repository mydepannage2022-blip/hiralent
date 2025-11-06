'use client';

import React, { useState } from 'react';
import { CiSearch } from 'react-icons/ci';
import { IoIosNotificationsOutline } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { HiExclamationTriangle } from 'react-icons/hi2';
import { useAuth } from '../../../../context/AuthContext';
import { useProfile } from '../../../../context/ProfileContext';
import { usePathname } from 'next/navigation';
import SmartLink from '../../../layout/SmartLink';
import NotificationModal from '../notifications/NotificationModal';
import { Notification } from '../notifications/NotificationItem';

// Example notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    title:
      'Prime Works Ltd has started following your profile. Visit their page to see their latest job postings and company updates just now.',
    tag: 'Message',
    time: '22:14 AM',
    read: false,
    starred: true
  },
  {
    id: '2',
    title: 'Your resume has been successfully submitted for Tech Nova Inc.check out your dashboard for real time status updates...',
    tag: 'Meeting',
    time: '22:14 AM',
    read: false
  },
  {
    id: '3',
    title: 'Your profile is almost complete! Add a few more details to increase your visibility to employers and get personalized job suggestions.',
    tag: 'Message',
    time: '22:14 AM',
    read: true
  },
  {
    id: '4',
    title: 'Your resume has been successfully submitted for the ‘Product Design’ position at Global Crop Solution. We’ll keep you updated on the next steps.',
    tag: 'Meeting',
    time: '22:14 AM',
    read: true
  },
  {
    id: '5',
    title: `Google's service, offered free of charge, instantly translates words, phrases, and web pages between English and over 100 other languages.`,
    tag: 'Message',
    time: '22:14 AM',
    read: true
  },
  {
    id: '6',
    title: 'Exciting opportunity! A ‘Digital Marketing Specialist’ role has just been posted at Bright Solutions Group. Check your dashboard for more  information and apply now.',
    tag: 'New Applications',
    time: '22:14 AM',
    read: false,
    starred: true
  },
];

interface DashboardNavbarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  isMobileMenuOpen = false,
  setIsMobileMenuOpen = () => { },
}) => {
  const { user } = useAuth();
  const { profileData } = useProfile();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => e.preventDefault();
  const handleMobileMenuToggle = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const getProfileImage = () =>
    profileData?.profile_picture_url || "/images/candidate.jpg";

  const getUserHeadlineOrEmail = () =>
    profileData?.headline || user?.email || 'Professional seeking new opportunities';

  const isEmailVerified = () => user?.is_email_verified || false;

  const getVerificationIcon = () =>
    isEmailVerified() ? null : (
      <SmartLink href='/auth/verify-email'>
        <HiExclamationTriangle
          className="w-3 h-3 text-orange-500 flex-shrink-0"
          title="Email Not Verified"
        />
      </SmartLink>
    );

  const getPageInfo = () => {
    switch (pathname) {
      case '/company/dashboard/employer-profile':
        return { title: 'Profile', description: 'Updating your information will offer you the most relevent content' };
      case '/company/dashboard/postjob':
        return { title: 'Post Job', description: 'Updating your information will offer you the most relevent content' };
       // ✅ NEW: My Jobs
      case '/company/dashboard/jobManagement':
        return { title: 'My Jobs', description: 'Create, edit, and track all your job postings' };
       // ✅ NEW: My Assessments
      case '/company/dashboard/assessmentManagement':
        return { title: 'My Assessments', description: 'Build and manage candidate assessments' };
      case '/company/dashboard/notifications':
        return { title: 'Notifications', description: 'Updating your information will offer you the most relevent content' };
      case '/company/dashboard/manage-hiring':
        return { title: 'Manage Hiring', description: 'Updating your information will offer you the most relevent content' };
      case '/company/dashboard/messages':
        return { title: 'Messages', description: 'Updating your information will offer you the most relevent content' };
      case '/company/dashboard/settings':
        return { title: 'Settings', description: 'Updating your information will offer you the most relevent content' };
      default:
        return { title: 'Dashboard', description: 'Updating your information will offer you the most relevent content' };
    }
  };

  const { title, description } = getPageInfo();

  return (
    <div className="relative w-full flex flex-col sm:flex-row justify-start items-start sm:items-center text-[#282828] gap-4 sm:gap-0">
      {/* Left Section */}
      <div className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/2 flex items-center gap-3">
        <button
          onClick={handleMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <HiOutlineMenuAlt3 className="text-2xl text-[#353535]" />
        </button>

        <div className="flex-1">
          <h3 className="font-bold text-lg sm:text-xl lg:text-xl xl:text-2xl">{title}</h3>
          <p className="font-light text-xs sm:text-xs xl:text-sm text-[#515151] hidden sm:block">
            {description}
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative w-full sm:w-1/2 lg:w-2/3 xl:w-1/2 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 lg:gap-8">
        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex justify-between items-center bg-white p-2 sm:p-3 rounded-lg w-full sm:w-2/3 lg:w-2/3"
        >
          <input
            type="text"
            placeholder="Search"
            className="outline-none text-sm sm:text-base w-full"
          />
          <button type="submit">
            <CiSearch className="text-xl sm:text-2xl hover:text-gray-600 transition-colors" />
          </button>
        </form>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notification-bell"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="cursor-pointer hover:text-gray-600 transition-colors relative"
          >
            <IoIosNotificationsOutline className="text-2xl sm:text-3xl lg:text-4xl xl:text-2xl" />
            {notifications.some((n) => !n.read) && (
              <span className="absolute -top-1 -right-1 bg-[#005DDC] text-white text-[10px] rounded-full px-1.5 py-[1px]">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>

          {/* Notification Modal */}
          <NotificationModal
            notifications={notifications}
            onUpdate={setNotifications}
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        {/* Profile */}
        <div className="flex justify-center items-center gap-2">
          <img
            src={getProfileImage()}
            alt="User"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all"
          />
          <div className="hidden lg:hidden xl:flex flex-col justify-center items-start">
            <div className="flex items-center gap-1">
              <h3 className="text-[#222] text-sm lg:text-base">
                {user?.full_name || 'Guest User'}
              </h3>
              {getVerificationIcon()}
            </div>
            <span
              className="text-xs lg:text-sm text-[#A5A5A5] max-w-48 truncate"
              title={getUserHeadlineOrEmail()}
            >
              {getUserHeadlineOrEmail()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardNavbar;