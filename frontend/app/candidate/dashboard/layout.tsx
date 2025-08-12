"use client"
import { useState, ReactNode } from 'react';
import DashboardNavbar from '@/app/src/components/candidate/dashboard/DashboardNavbar';
import DashboardSidebar from '@/app/src/components/candidate/dashboard/DashboardSidebar';
import ProtectedRoute from '@/app/src/components/layout/ProtectedRoute';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <ProtectedRoute>
      <div className="w-full bg-[#F9F9F9] flex justify-center items-center">
        <div className="w-full xl:max-w-9/10 flex justify-center items-start p-8 gap-8">
          
          {/* Sticky Sidebar */}
          <div className='flex justify-start items-start sticky top-8 self-start'>
            <DashboardSidebar isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
          
          {/* Main Content Area */}
          <div className="w-full flex flex-col justify-start items-start">
            <DashboardNavbar />
            
            {/* Dynamic Content */}
            <div className='w-full py-4'>
              {children}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}