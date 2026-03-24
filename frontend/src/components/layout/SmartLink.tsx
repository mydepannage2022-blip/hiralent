"use client";

import Link from 'next/link';
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
  replace = false,
}: SmartLinkProps) => {
  const { startNavigation } = useNavigationLoading();

  const handleClick = () => {
    if (onClick) onClick();
    startNavigation();
  };

  return (
    <Link
      href={href}
      replace={replace}
      onClick={handleClick}
      className={`${className} cursor-pointer`}
      prefetch={true}
    >
      {children}
    </Link>
  );
};

export default SmartLink;
