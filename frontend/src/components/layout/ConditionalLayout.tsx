"use client";
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
interface ConditionalLayoutProps {
  children: React.ReactNode;
}
const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();

const excludeLayoutRoutes = [
    '/candidate/dashboard',
    '/candidate/dashboard/candidate-profile',
    '/candidate/dashboard/notifications', 
    '/candidate/dashboard/messages',
    '/candidate/dashboard/settings',
    '/candidate/dashboard/analytics',
    '/company/dashboard',
    '/agency/dashboard',
    '/admin/dashboard',
    '/admin/login',
    '/auth/',
    '/job/findjob',
    '/code-run',
    '/company/public-profile',  // <-- ADD
  ];

  // Also check dynamic company slug routes
  const isCompanyPublicProfile = pathname ? /^\/company\/[^\/]+$/.test(pathname) && !pathname.startsWith('/company/dashboard') && !pathname.startsWith('/company/discover') && !pathname.startsWith('/company/pricing') && !pathname.startsWith('/company/checkout') && !pathname.startsWith('/company/home') : false;

  const shouldHideLayout = pathname ? (excludeLayoutRoutes.some(route => pathname.startsWith(route)) || isCompanyPublicProfile) : false;


  return (
    <>
      {!shouldHideLayout && <Navbar />}
      {children}
      {!shouldHideLayout && <Footer />}
    </>
  );
};
export default ConditionalLayout;