"use client"
import { useState, ReactNode } from 'react';
import ProtectedRoute from '@/src/components/layout/ProtectedRoute';
import DashboardSidebar from '@/src/components/company/dashboard/home/DashboardSidebar';
import DashboardNavbar from '@/src/components/company/dashboard/home/DashboardNavbar';
import { AgencyProfileProvider } from '@/src/context/AgencyProfileContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Settings,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function AgencyDashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Agency-specific menu items
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/agency/dashboard' },
    { name: 'Profile', icon: Building2, href: '/agency/dashboard/profile' },
    { name: 'Cases', icon: Users, href: '/agency/dashboard/cases' },
    { name: 'Messages', icon: MessageSquare, href: '/agency/dashboard/messages' },
    { name: 'Settings', icon: Settings, href: '/agency/dashboard/settings' },
  ];

  return (
    <ProtectedRoute>
      <AgencyProfileProvider>
        <div className="w-full bg-[#F9F9F9] flex justify-center items-start min-h-screen">
          <div className="w-full xl:max-w-9/10 flex justify-center items-start p-4 md:p-8 gap-4 md:gap-8">
          
          {/* Desktop Sticky Sidebar */}
          <div className='hidden lg:flex justify-start items-start sticky top-8 self-start'>
            <DashboardSidebar 
              isOpen={isOpen} 
              setIsOpen={setIsOpen}
              isMobile={false}
              isMobileMenuOpen={false}
              setIsMobileMenuOpen={() => {}}
              menuItems={menuItems}
            />
          </div>
          
          {/* Mobile Overlay Sidebar */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full">
                <DashboardSidebar 
                  isOpen={true}
                  setIsOpen={() => {}}
                  isMobile={true}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                  menuItems={menuItems}
                />
              </div>
            </div>
          )}
          
          {/* Main Content Area */}
          <div className="w-full flex flex-col justify-start items-start">
            <DashboardNavbar 
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
            
            {/* Dynamic Content */}
            <div className='w-full py-4'>
              {children}
            </div>
          </div>
        </div>
      </div>
      </AgencyProfileProvider>
    </ProtectedRoute>
  );
}