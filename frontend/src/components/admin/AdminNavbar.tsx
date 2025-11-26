'use client';

import { useState, useEffect } from 'react';
import { Menu, Bell, Search, Shield } from 'lucide-react';

interface AdminNavbarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (value: boolean) => void;
}

export default function AdminNavbar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: AdminNavbarProps) {
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    // Get admin user from localStorage
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      try {
        setAdmin(JSON.parse(adminUser));
      } catch (error) {
        console.error('Error parsing admin user:', error);
      }
    }
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>

        {/* Center: Search bar (desktop only) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right: Admin info & actions */}
        <div className="flex items-center gap-3">
          {/* Super Admin Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
            <Shield className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">SUPER ADMIN</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Admin Profile */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-800">
                {admin?.name || admin?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-xs text-slate-500">Super Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {admin?.name?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden mt-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}