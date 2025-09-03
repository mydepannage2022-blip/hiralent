"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { ProfileCompletenessResponse } from '../lib/profile.api';

interface ProfileContextType {
  // Profile completeness data (API response with scores/metrics)
  profileCompleteness: any;
  setProfileCompleteness: (data: any) => void;
  
  // Actual profile data (from login response)
  profileData: any;
  setProfileData: (data: any) => void;
  
  // Utility functions
  refreshProfile: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileCompleteness, setProfileCompleteness] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load profile data (from login)
      const savedProfileData = localStorage.getItem('profileData');
      if (savedProfileData) {
        try {
          const profileData = JSON.parse(savedProfileData);
          setProfileData(profileData);
        } catch (error) {
          console.error('Error parsing saved profile data:', error);
          localStorage.removeItem('profileData');
        }
      }

      // Load profile completeness data (from API)
      const savedProfileCompleteness = localStorage.getItem('profileCompleteness');
      if (savedProfileCompleteness) {
        try {
          const completenessData = JSON.parse(savedProfileCompleteness);
          setProfileCompleteness(completenessData);
        } catch (error) {
          console.error('Error parsing saved profile completeness:', error);
          localStorage.removeItem('profileCompleteness');
        }
      }
    }
  }, []);

  // Save profile data to localStorage when it changes
  useEffect(() => {
    if (profileData && typeof window !== 'undefined') {
      localStorage.setItem('profileData', JSON.stringify(profileData));
    }
  }, [profileData]);

  // Save profile completeness to localStorage when it changes
  useEffect(() => {
    if (profileCompleteness && typeof window !== 'undefined') {
      localStorage.setItem('profileCompleteness', JSON.stringify(profileCompleteness));
    }
  }, [profileCompleteness]);

  // Function to trigger profile refresh
  const refreshProfile = () => {
    // Clear both states to trigger re-fetch
    setProfileCompleteness(null);
    setProfileData(null);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profileData');
      localStorage.removeItem('profileCompleteness');
    }
  };

  return (
    <ProfileContext.Provider 
      value={{ 
        profileCompleteness, 
        setProfileCompleteness,
        profileData,
        setProfileData,
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