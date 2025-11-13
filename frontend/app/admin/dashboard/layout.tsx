'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BadgeCheck,
  BarChart3,
  FileWarning,
  Users,
  Settings,
} from 'lucide-react';

import DashboardSidebar from '@/src/components/company/dashboard/home/DashboardSidebar';
import DashboardNavbar from '@/src/components/company/dashboard/home/DashboardNavbar';

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // keep your existing auth logic
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ui state (same pattern as company layout)
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const adminUser = localStorage.getItem('adminUser');

      if (sessionToken && adminUser) {
        setAdmin(JSON.parse(adminUser));
      } else {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('tempToken');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // same shape the company sidebar expects
  const menuItems = [
    { name: 'Dashboard',     icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Verifications', icon: BadgeCheck,      href: '/admin/dashboard/verifications' },
    { name: 'Analytics',     icon: BarChart3,       href: '/admin/dashboard/analytics' },
    // optional admin sections
    { name: 'Security Log',  icon: FileWarning,     href: '/admin/dashboard/security-log' },
    { name: 'Admins',        icon: Users,           href: '/admin/dashboard/admins' },
    { name: 'Settings',      icon: Settings,        href: '/admin/dashboard/settings' },
  ];

  return (
    <div className="w-full bg-[#F9F9F9] flex justify-center items-center">
      <div className="w-full xl:max-w-9/10 flex justify-center items-start p-4 md:p-8 gap-4 md:gap-8">
        {/* Desktop Sidebar (same component/style as company) */}
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

        {/* Content column (same navbar style as company) */}
        <div className="w-full flex flex-col justify-start items-start">
          <DashboardNavbar
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Optional: small admin badge + quick logout (top-right actions can live in the navbar in your app; 
              if not, keep a lightweight header here) */}
          <div className="w-full py-2 flex items-center justify-between">
            <div className="hidden md:flex items-center gap-2 text-xs text-[#1B73E8] font-medium bg-[#1B73E8]/10 px-2.5 py-1 rounded">
              <span>SUPER ADMIN</span>
            </div>
            <button
              onClick={logout}
              className="ml-auto text-sm text-red-600 hover:text-red-700 hover:underline"
            >
              Logout
            </button>
          </div>

          <div className="w-full py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
