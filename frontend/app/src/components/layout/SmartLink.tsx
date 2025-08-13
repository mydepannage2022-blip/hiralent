"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';
import { useEffect, useRef } from 'react';

interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: () => void;
}

const SmartLink = ({ 
  href, 
  children, 
  className = "", 
  prefetch = true,
  onClick
}: SmartLinkProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation, stopNavigation } = useNavigationLoading();
  const previousPathname = useRef(pathname);

  const handleClick = (e: React.MouseEvent) => {
    // Agar same page pe hai to navigation start nahi karna
    if (pathname === href) {
      return;
    }
    
    startNavigation();
    
    // User ka custom onClick call karo
    if (onClick) {
      onClick();
    }

    // Safety timeout - 2 seconds baad force stop
    setTimeout(() => {
      stopNavigation();
    }, 5000);
  };

  // Pathname change detection
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      // Path change hui hai, navigation complete
      stopNavigation();
      previousPathname.current = pathname;
    }
  }, [pathname, stopNavigation]);

  // Page load complete detection
  useEffect(() => {
    const handleLoad = () => {
      stopNavigation();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
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