// frontend/src/context/ProfileContext.tsx

"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { ProfileCompletenessResponse } from '../lib/profile/profile.api';
import { AssessmentState , CurrentAssessment } from '../types/assessment.types'; 

interface ProfileContextType {
  // Profile completeness data (API response with scores/metrics)
  profileCompleteness: any;
  setProfileCompleteness: (data: any) => void;
  
  // Actual profile data (from login response)
  profileData: any;
  setProfileData: (data: any) => void;
  
  // ✅ NEW: Assessment State Management
  assessmentState: AssessmentState;
  setAssessmentState: (state: Partial<AssessmentState>) => void;
  updateAssessmentProgress: (progress: { currentQuestionIndex: number; timeElapsed: number }) => void;
  clearAssessmentState: () => void;
  
  // Utility functions
  refreshProfile: () => void;
  clearProfile: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileCompleteness, setProfileCompleteness] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // ✅ NEW: Assessment State
  const [assessmentState, setAssessmentStateInternal] = useState<AssessmentState>({
    currentAssessment: null,
    assessmentHistory: [],
    skillRecommendations: [],
    loading: false,
    error: null
  });

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

      // ✅ NEW: Load assessment state from localStorage
      const savedAssessmentState = localStorage.getItem('assessmentState');
      if (savedAssessmentState) {
        try {
          const assessmentData = JSON.parse(savedAssessmentState);
          setAssessmentStateInternal(assessmentData);
        } catch (error) {
          console.error('Error parsing saved assessment state:', error);
          localStorage.removeItem('assessmentState');
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

  // ✅ NEW: Save assessment state to localStorage when it changes
  useEffect(() => {
    if (assessmentState && typeof window !== 'undefined') {
      localStorage.setItem('assessmentState', JSON.stringify(assessmentState));
    }
  }, [assessmentState]);

  // Function to trigger profile refresh
  const refreshProfile = () => {
    setProfileCompleteness(null);
    setProfileData(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profileData');
      localStorage.removeItem('profileCompleteness');
    }
  };

  const clearProfile = () => {
    console.log('Clearing profile data');
    
    setProfileCompleteness(null);
    setProfileData(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profileData');
      localStorage.removeItem('profileCompleteness');
    }
  };

  // ✅ NEW: Assessment State Management Functions
  const setAssessmentState = (newState: Partial<AssessmentState>) => {
    setAssessmentStateInternal(prevState => ({
      ...prevState,
      ...newState
    }));
  };

  const updateAssessmentProgress = (progress: { currentQuestionIndex: number; timeElapsed: number }) => {
    setAssessmentStateInternal(prevState => ({
      ...prevState,
      currentAssessment: prevState.currentAssessment ? {
        ...prevState.currentAssessment,
        currentQuestionIndex: progress.currentQuestionIndex,
        timeElapsed: progress.timeElapsed
      } : null
    }));
  };

  const clearAssessmentState = () => {
    const clearedState: AssessmentState = {
      currentAssessment: null,
      assessmentHistory: assessmentState.assessmentHistory, // Keep history
      skillRecommendations: assessmentState.skillRecommendations, // Keep recommendations
      loading: false,
      error: null
    };
    
    setAssessmentStateInternal(clearedState);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('assessmentState', JSON.stringify(clearedState));
    }
  };

  return (
    <ProfileContext.Provider 
      value={{ 
        profileCompleteness, 
        setProfileCompleteness,
        profileData,
        setProfileData,
        // ✅ NEW: Assessment State Providers
        assessmentState,
        setAssessmentState,
        updateAssessmentProgress,
        clearAssessmentState,
        refreshProfile,
        clearProfile,
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