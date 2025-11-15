'use client';

import { useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BadgeCheck,
  BarChart3,
  FileWarning,
  Users,
  Settings,
} from 'lucide-react';

import ProtectedRoute from '@/src/components/layout/ProtectedRoute'; // or your admin guard
import DashboardSidebar from '@/src/components/company/dashboard/home/DashboardSidebar';
import DashboardNavbar from '@/src/components/company/dashboard/home/DashboardNavbar';

interface AdminDashboardLayoutProps {
  children: ReactNode;
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard',     icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Verifications', icon: BadgeCheck,      href: '/admin/dashboard/verifications' },
    { name: 'Analytics',     icon: BarChart3,       href: '/admin/dashboard/analytics' },
    { name: 'Security Log',  icon: FileWarning,     href: '/admin/dashboard/security-log' },
    { name: 'Admins',        icon: Users,           href: '/admin/dashboard/admins' },
    { name: 'Settings',      icon: Settings,        href: '/admin/dashboard/settings' },
  ];

  return (
    <ProtectedRoute>
      <div className="w-full bg-[#F9F9F9] flex justify-center items-center">
        <div className="w-full xl:max-w-9/10 flex justify-center items-start p-4 md:p-8 gap-4 md:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex justify-start items-start sticky top-8 self-start">
            <DashboardSidebar
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              isMobile={false}
              isMobileMenuOpen={false}
              setIsMobileMenuOpen={() => {}}
              menuItems={menuItems}
            />
          </div>

          {/* Mobile Sidebar */}
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

          {/* Content column */}
          <div className="w-full flex flex-col justify-start items-start">
            <DashboardNavbar
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
            <div className="w-full py-4">{children}</div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
