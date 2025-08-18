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
    if (pathname === href) {
      return;
    }
    
    startNavigation();
    
    if (onClick) {
      onClick();
    }

    setTimeout(() => {
      stopNavigation();
    }, 10000);
  };

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      stopNavigation();
      previousPathname.current = pathname;
    }
  }, [pathname, stopNavigation]);

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