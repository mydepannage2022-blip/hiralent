'use client';

import { useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BadgeCheck,
  BarChart3,
  FileWarning,
  Users,
  Settings,
  LogOut,
  Building2,
  CreditCard,
} from 'lucide-react';

import DashboardSidebar from '@/src/components/company/dashboard/home/DashboardSidebar';
import AdminNavbar from '@/src/components/admin/AdminNavbar';

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  // Auth state
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use useCallback to memoize the checkAuth function
  const checkAuth = useCallback(() => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const adminUser = localStorage.getItem('adminUser');

      if (sessionToken && adminUser) {
        const parsedAdmin = JSON.parse(adminUser);
        setAdmin(parsedAdmin);
        setLoading(false);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/admin/login');
    }
  }, [router]);

  // Only run once on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('tempToken');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Admin sidebar menu items
  const menuItems = [
    { name: 'Dashboard',     icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Verifications', icon: BadgeCheck,      href: '/admin/dashboard/verifications' },
    { name: 'Agencies',      icon: Building2,       href: '/admin/dashboard/agencies' },
    { name: 'Analytics',     icon: BarChart3,       href: '/admin/dashboard/analytics' },
    { name: 'Billing',       icon: CreditCard,      href: '/admin/dashboard/billing' },
    { name: 'Security Log',  icon: FileWarning,     href: '/admin/dashboard/security-log' },
    { name: 'Admins',        icon: Users,           href: '/admin/dashboard/admins' },
    { name: 'Settings',      icon: Settings,        href: '/admin/dashboard/settings' },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen flex justify-center items-center">
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

        {/* Main Content Column */}
        <div className="w-full flex flex-col justify-start items-start">
          {/* Custom Admin Navbar - shows admin user info */}
          <AdminNavbar
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Admin Info Bar with Logout */}
          <div className="w-full mb-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <span className="text-white text-lg font-bold">
                    {admin?.name?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {admin?.name || 'Super Administrator'}
                  </h3>
                  <p className="text-sm text-slate-500">{admin?.email || 'admin@hiralent.com'}</p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition-colors border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}