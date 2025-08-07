"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { ProfileCompletenessResponse } from '../lib/profile.api';

interface ProfileContextType {
  profileCompleteness: any; 
  setProfileCompleteness: (data: any) => void;
  refreshProfile: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileCompleteness, setProfileCompleteness] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Function to trigger profile refresh
  const refreshProfile = () => {
    setProfileCompleteness(null);
  };

  return (
    <ProfileContext.Provider 
      value={{ 
        profileCompleteness, 
        setProfileCompleteness, 
        refreshProfile,
        loading,
        setLoading
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};