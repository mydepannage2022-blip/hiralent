"use client";

import { useRouter } from 'next/navigation';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';

interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  replace?: boolean;
}

const SmartLink = ({ 
  href, 
  children, 
  className = "", 
  onClick,
  replace = false
}: SmartLinkProps) => {
  const router = useRouter();
  const { startNavigation, stopNavigation } = useNavigationLoading();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Execute custom onClick if provided
    if (onClick) {
      onClick();
    }

    // Start loading
    startNavigation();

    try {``
      // Direct router navigation
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      stopNavigation();
    }

    // Safety timeout
    setTimeout(() => {
      stopNavigation();
    }, 3000);
  };

  return (
    <div 
      onClick={handleClick}
      className={`${className} cursor-pointer`}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as any);
        }
      }}
    >
      {children}
    </div>
  );
};

export default SmartLink;