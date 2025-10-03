// frontend/src/context/ProfileContext.tsx

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProfileCompletenessResponse } from '../lib/profile/profile.api';
import { AssessmentState , CurrentAssessment } from '../types/assessment.types'; 

interface ProfileContextType {
  profileCompleteness: any;
  setProfileCompleteness: (data: any) => void;
  profileData: any;
  setProfileData: (data: any) => void;
  assessmentState: AssessmentState;
  setAssessmentState: (state: Partial<AssessmentState>) => void;
  updateAssessmentProgress: (progress: { currentQuestionIndex: number; timeElapsed: number }) => void;
  clearAssessmentState: () => void;
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
  
  const [assessmentState, setAssessmentStateInternal] = useState<AssessmentState>({
    currentAssessment: null,
    assessmentHistory: [],
    currentQuestion: null,
    skillRecommendations: [],
    loading: false,
    error: null
  });

  // ✅ FIX: Load data from localStorage ONLY once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfileData = localStorage.getItem('profileData');
      if (savedProfileData) {
        try {
          setProfileData(JSON.parse(savedProfileData));
        } catch (error) {
          console.error('Error parsing saved profile data:', error);
          localStorage.removeItem('profileData');
        }
      }

      const savedProfileCompleteness = localStorage.getItem('profileCompleteness');
      if (savedProfileCompleteness) {
        try {
          setProfileCompleteness(JSON.parse(savedProfileCompleteness));
        } catch (error) {
          console.error('Error parsing saved profile completeness:', error);
          localStorage.removeItem('profileCompleteness');
        }
      }

      const savedAssessmentState = localStorage.getItem('assessmentState');
      if (savedAssessmentState) {
        try {
          setAssessmentStateInternal(JSON.parse(savedAssessmentState));
        } catch (error) {
          console.error('Error parsing saved assessment state:', error);
          localStorage.removeItem('assessmentState');
        }
      }
    }
  }, []); // Empty dependency - run ONCE

  // Save to localStorage when data changes
  useEffect(() => {
    if (profileData && typeof window !== 'undefined') {
      localStorage.setItem('profileData', JSON.stringify(profileData));
    }
  }, [profileData]);

  useEffect(() => {
    if (profileCompleteness && typeof window !== 'undefined') {
      localStorage.setItem('profileCompleteness', JSON.stringify(profileCompleteness));
    }
  }, [profileCompleteness]);

  useEffect(() => {
    if (assessmentState && typeof window !== 'undefined') {
      localStorage.setItem('assessmentState', JSON.stringify(assessmentState));
    }
  }, [assessmentState]);

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

  // ✅ FIX: Use useCallback to memoize function - prevents infinite loop
  const setAssessmentState = useCallback((newState: Partial<AssessmentState>) => {
    setAssessmentStateInternal(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []); // Empty deps - function never changes

  const updateAssessmentProgress = useCallback((progress: { currentQuestionIndex: number; timeElapsed: number }) => {
    setAssessmentStateInternal(prevState => ({
      ...prevState,
      currentAssessment: prevState.currentAssessment ? {
        ...prevState.currentAssessment,
        currentQuestionIndex: progress.currentQuestionIndex,
        timeElapsed: progress.timeElapsed
      } : null
    }));
  }, []); // Empty deps

  const clearAssessmentState = useCallback(() => {
    setAssessmentStateInternal(prevState => {
      const clearedState: AssessmentState = {
        currentAssessment: null,
        currentQuestion: null,
        assessmentHistory: prevState.assessmentHistory,
        skillRecommendations: prevState.skillRecommendations,
        loading: false,
        error: null
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('assessmentState', JSON.stringify(clearedState));
      }
      
      return clearedState;
    });
  }, []); // Empty deps

  return (
    <ProfileContext.Provider 
      value={{ 
        profileCompleteness, 
        setProfileCompleteness,
        profileData,
        setProfileData,
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