"use client";
import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Bell,
  MessageSquare,
  Settings,
  Activity,
  Settings2,
  SquarePlus,
  MessageSquareText,
  Briefcase,
  CheckSquare,
  BookOpen,    // 👈 add for Question Bank
  Clock,       // 👈 add for Review Queue
} from "lucide-react";

import ProtectedRoute from "@/src/components/layout/ProtectedRoute";
import DashboardSidebar from "@/src/components/company/dashboard/home/DashboardSidebar";
import DashboardNavbar from "@/src/components/company/dashboard/home/DashboardNavbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // 👉 Define menus with new items
  const defaultMenu = [
    { name: "Dashboard",        icon: LayoutDashboard, href: "/company/dashboard" },
    { name: "Employer Profile", icon: User,            href: "/company/dashboard/employer-profile" },
    { name: "Post Job",         icon: SquarePlus,      href: "/company/dashboard/postjob" },

    // ✅ your existing sections
    { name: "My Jobs",          icon: Briefcase,       href: "/company/dashboard/jobManagement" },
    { name: "My Assessments",   icon: CheckSquare,     href: "/company/dashboard/assessmentManagement" },

    // ✅ NEW SECTIONS
    { name: "Question Bank",    icon: BookOpen,        href: "/company/dashboard/questions" },
    { name: "Review Queue",     icon: Clock,           href: "/company/dashboard/review-queue" },

    { name: "Notifications",    icon: Bell,            href: "/company/dashboard/notifications" },
    { name: "Messages",         icon: MessageSquareText, href: "/company/dashboard/messages" },
    { name: "Account Setting",  icon: Settings,        href: "/company/dashboard/settings" },
    { name: "Manage Hiring",    icon: Settings2,       href: "/company/dashboard/manage-hiring" },
  ];

  const postJobMenu = [
    { name: "Dashboard",        icon: LayoutDashboard, href: "/company/dashboard" },
    { name: "Employer Profile", icon: User,            href: "/company/dashboard/employer-profile" },
    { name: "Post Job",         icon: SquarePlus,      href: "/company/dashboard/postjob" },

    // ✅ also include here so they appear while on /postjob
    { name: "My Jobs",          icon: Briefcase,       href: "/company/dashboard/jobManagement" },
    { name: "My Assessments",   icon: CheckSquare,     href: "/company/dashboard/assessmentManagement" },

    // ✅ NEW SECTIONS (also in postJobMenu)
    { name: "Question Bank",    icon: BookOpen,        href: "/company/dashboard/questions" },
    { name: "Review Queue",     icon: Clock,           href: "/company/dashboard/review-queue" },

    { name: "Notifications",    icon: Bell,            href: "/company/dashboard/notifications" },
    { name: "Messages",         icon: MessageSquareText, href: "/company/dashboard/messages" },
    { name: "Account Setting",  icon: Settings,        href: "/company/dashboard/settings" },
    { name: "Manage Hiring",    icon: Settings2,       href: "/company/dashboard/manage-hiring" },
  ];

  // 👉 Switch menus based on route
  const menuItems = pathname.startsWith("/company/dashboard/postjob")
    ? postJobMenu
    : defaultMenu;

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

          {/* Content */}
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