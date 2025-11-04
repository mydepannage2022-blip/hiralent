import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  User,
  Bell,
  MessageSquare,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Subscript,
  LucideIcon,
  X
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import SmartLink from '../../../layout/SmartLink';
import LogoutModal from '../../../layout/LogoutModal';
import { useAuth } from '../../../../context/AuthContext';

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href: string;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isOpen,
  setIsOpen,
  isMobile,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [activeItem, setActiveItem] = useState<string>('Dashboard');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/candidate/dashboard' },
    { name: 'Profile', icon: User, href: '/candidate/dashboard/candidate-profile' },
    { name: 'Notifications', icon: Bell, href: '/candidate/dashboard/notifications' },
    { name: 'Messages', icon: MessageSquare, href: '/candidate/dashboard/messages' },
    { name: 'Settings', icon: Settings, href: '/candidate/dashboard/settings' },
    { name: 'Analytics', icon: Activity, href: '/candidate/dashboard/analytics' },
    { name: 'Skills Assessment', icon: Subscript, href: '/candidate/dashboard/skills-assessment' }
  ];

  // Update active item based on current pathname
  useEffect(() => {
    const currentItem = menuItems.find(item => item.href === pathname);
    if (currentItem) {
      setActiveItem(currentItem.name);
    }
  }, [pathname]);

  // Logout handlers
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    router.push("/auth/login");
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Handle mobile menu item click
  const handleMobileItemClick = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // Mobile drawer styles
  const mobileDrawerClasses = isMobile ?
    `fixed top-0 left-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
    }`
    : '';

  // Desktop sidebar styles  
  const desktopSidebarClasses = !isMobile ?
    `flex bg-[#FFFFFF] rounded-xl ${isOpen ? 'lg:w-42 xl:w-64' : 'w-20'}`
    : '';

  return (
    <>
      <div className={isMobile ? mobileDrawerClasses : desktopSidebarClasses}>
        <div className={`${isMobile
            ? 'w-full h-full'
            : isOpen ? 'lg:w-42 xl:w-64' : 'w-20'
          } flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out rounded-xl`}>

          <div className='w-full flex-1'>
            {/* Header with Company Logo */}
            <div className="flex flex-row-reverse items-center justify-center py-4 px-4 border-b border-gray-200 relative">
              <div className={`flex flex-col items-center ${
                (isOpen && !isMobile) || isMobile ? 'space-x-3' : 'justify-center hidden'
              }`}>
                <div className="rounded-lg flex items-center justify-center">
                  <img src="/images/logo.png" alt="Logo" className="w-30 h-9" />
                </div>
                {((isOpen && !isMobile) || isMobile) && (
                  <div>
                    <p className="text-sm text-gray-500">Dashboard</p>
                  </div>
                )}
              </div>

              {/* Desktop Toggle Button */}
              {!isMobile && (
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={`${isOpen ? 'absolute right-1 bottom-[-15%] p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-[#353535] cursor-pointer' : 'w-full flex justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-[#353535] cursor-pointer'} `}
                >
                  {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              )}

              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={20} className="text-[#353535]" />
                </button>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="mt-6 text-black">
              <ul className="space-y-2 px-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.name}>
                      <SmartLink
                        href={item.href}
                        onClick={handleMobileItemClick}
                        className={`w-full flex items-center cursor-pointer font-normal ${
                          (isOpen && !isMobile) || isMobile 
                            ? 'lg:px-2 xl:px-4 py-3 space-x-3' 
                            : 'px-3 py-3 justify-center'
                          } rounded-lg transition-all duration-200 ${isActive
                            ? 'bg-[#EDEDED]'
                            : 'text-[#353535] hover:bg-gray-50'
                          }`}
                      >
                        <Icon size={22} className="flex-shrink-0 text-[#353535] text-sm" />
                        {((isOpen && !isMobile) || isMobile) && (
                          <span className="font-normal text-base">{item.name}</span>
                        )}
                      </SmartLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Logout Button */}
          <div className='w-full p-4 border-t border-gray-200 mt-16'>
            <button 
              onClick={handleLogoutClick}
              className={`w-full flex items-center cursor-pointer ${(isOpen && !isMobile) || isMobile
                  ? 'px-4 py-3 space-x-3 justify-start'
                  : 'px-3 py-3 justify-center'
                } rounded-lg transition-all duration-200 hover:bg-gray-50`}
            >
              <LogOut size={22} className='flex-shrink-0 text-red-600' />
              {((isOpen && !isMobile) || isMobile) && (
                <span className='text-red-600 text-sm lg:text-base font-medium'>Logout</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <div className='z-50'>
        <LogoutModal
          isOpen={showLogoutModal}
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      </div>
    </>
  );
};

export default DashboardSidebar;