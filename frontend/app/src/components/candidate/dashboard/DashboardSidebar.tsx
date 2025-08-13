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
  LucideIcon
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href: string;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>('Dashboard');

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/candidate/dashboard' },
    { name: 'Profile', icon: User, href: '/candidate/dashboard/candidate-profile' },
    { name: 'Notifications', icon: Bell, href: '/candidate/dashboard/notifications' },
    { name: 'Messages', icon: MessageSquare, href: '/candidate/dashboard/messages' },
    { name: 'Settings', icon: Settings, href: '/candidate/dashboard/settings' },
    { name: 'Analytics', icon: Activity, href: '/candidate/dashboard/analytics' }
  ];

  // Update active item based on current pathname
  useEffect(() => {
    const currentItem = menuItems.find(item => item.href === pathname);
    if (currentItem) {
      setActiveItem(currentItem.name);
    }
  }, [pathname]);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className={`flex bg-[#FFFFFF] rounded-xl ${isOpen ? 'lg:w-42 xl:w-64' : 'w-20'}`}>
      <div className={`${isOpen ? 'lg:w-42 xl:w-64' : 'w-20'} flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out rounded-xl gap-50`}>
        
        <div className='w-full flex-1'>
          {/* Header with Company Logo */}
          <div className="flex flex-row-reverse items-center justify-between py-4 px-4 border-b border-gray-200 relative">
            <div className={`flex flex-col items-center ${isOpen ? 'space-x-3' : 'justify-center hidden'}`}>
              <div className="rounded-lg flex items-center justify-center">
                <img src="/images/logo.png" alt="Logo" />
              </div>
              {isOpen && (
                <div>
                  <p className="text-sm text-gray-500">Dashboard</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`${isOpen ? 'absolute right-1 bottom-[-15%] p-2 rounded-lg bg-gray-100 transition-colors text-[#353535]' : 'w-full flex justify-center p-2 rounded-lg bg-gray-100 transition-colors text-[#353535]'} `}
            >
              {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="mt-6 text-black">
            <ul className="space-y-2 px-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className={`w-full flex items-center ${
                        isOpen ? 'lg:px-2 xl:px-4 py-3 space-x-3' : 'px-3 py-3 justify-center'
                      } rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-[#EDEDED]'
                          : 'text-[#353535] hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={22} className="flex-shrink-0 text-[#353535]" />
                      {isOpen && (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </button>
                    {!isOpen && isActive && (
                      <div className="absolute left-20 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-10 pointer-events-none">
                        {item.name}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Logout Button */}
        <div className='w-full p-4 border-t border-gray-200'>
          <button 
            onClick={() => handleNavigation('/auth/logout')}
            className={`w-full flex items-center ${
              isOpen ? 'px-4 py-3 space-x-3 justify-start' : 'px-3 py-3 justify-center'
            } rounded-lg transition-all duration-200 hover:bg-gray-50`}
          >
            <LogOut size={22} className='flex-shrink-0 text-red-600' /> 
            {isOpen && <span className='text-red-600 text-sm lg:text-base font-medium'>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;