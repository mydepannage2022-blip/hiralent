"use client";

import { createContext, useContext, useState } from 'react';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | undefined>(undefined);

export const NavigationLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = () => {
    setIsNavigating(true);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
  };

  return (
    <NavigationLoadingContext.Provider value={{ 
      isNavigating, 
      startNavigation, 
      stopNavigation 
    }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
};

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return context;
};