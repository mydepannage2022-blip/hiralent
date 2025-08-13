"use client";

import { useNavigationLoading } from '../../context/NavigationLoadingContext';

const NavigationLoader = () => {
  const { isNavigating } = useNavigationLoading();

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse">
      <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse"></div>
    </div>
  );
};

export default NavigationLoader;