"use client";

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();

  // Routes where navbar/footer should NOT show
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
    '/auth/'
  ];

  const shouldHideLayout = excludeLayoutRoutes.some(route => 
    pathname.startsWith(route)
  );

  return (
    <>
      {!shouldHideLayout && <Navbar />}
      {children}
      {!shouldHideLayout && <Footer />}
    </>
  );
};

export default ConditionalLayout;