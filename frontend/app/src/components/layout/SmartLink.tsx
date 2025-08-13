"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';
import { useEffect } from 'react';

interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: () => void; // Add this line
}

const SmartLink = ({ 
  href, 
  children, 
  className = "", 
  prefetch = true,
  onClick // Add this
}: SmartLinkProps) => {
  const router = useRouter();
  const { startNavigation, stopNavigation } = useNavigationLoading();

  const handleClick = (e: React.MouseEvent) => {
    // Agar same page pe hai to navigation start nahi karna
    if (window.location.pathname === href) {
      return;
    }
    
    startNavigation();
    
    // User ka custom onClick call karo (jaise menu close karna)
    if (onClick) {
      onClick();
    }
    
    // Backup - 3 seconds baad automatically stop kar do
    setTimeout(() => {
      stopNavigation();
    }, 2300);
  };

  // Navigation complete hone pe stop karna
  useEffect(() => {
    const handleRouteChange = () => {
      stopNavigation();
    };

    // Page load complete hone pe
    if (typeof window !== 'undefined') {
      window.addEventListener('load', handleRouteChange);
      return () => window.removeEventListener('load', handleRouteChange);
    }
  }, [stopNavigation]);

  return (
    <Link 
      href={href} 
      className={className}
      prefetch={prefetch}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

export default SmartLink;