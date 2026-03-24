"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CANDIDATE_BASE = `${API_URL}/api/v1/candidates`;

interface ProfileContextType {
  profileCompleteness: any;
  setProfileCompleteness: (data: any) => void;
  profileData: any;
  setProfileData: (data: any) => void;
  assessmentState: any;
  setAssessmentState: (state: any) => void;
  updateAssessmentProgress: (progress: { currentQuestionIndex: number; timeElapsed: number }) => void;
  clearAssessmentState: () => void;
  refreshProfile: () => void;
  refetch: () => Promise<void>;
  clearProfile: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  dataVersion: number;
  forceRefresh: () => Promise<void>; // ✅ ADDED
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileCompleteness, setProfileCompleteness] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [assessmentState, setAssessmentStateInternal] = useState<any>({
    currentAssessment: null,
    assessmentHistory: [],
    currentQuestion: null,
    skillRecommendations: [],
    loading: false,
    error: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedProfileData = localStorage.getItem("profileData");
    if (savedProfileData) {
      try {
        setProfileData(JSON.parse(savedProfileData));
      } catch {
        localStorage.removeItem("profileData");
      }
    }

    const savedProfileCompleteness = localStorage.getItem("profileCompleteness");
    if (savedProfileCompleteness) {
      try {
        setProfileCompleteness(JSON.parse(savedProfileCompleteness));
      } catch {
        localStorage.removeItem("profileCompleteness");
      }
    }

    const savedAssessmentState = localStorage.getItem("assessmentState");
    if (savedAssessmentState) {
      try {
        setAssessmentStateInternal(JSON.parse(savedAssessmentState));
      } catch {
        localStorage.removeItem("assessmentState");
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && profileData) {
      localStorage.setItem("profileData", JSON.stringify(profileData));
    }
  }, [profileData]);

  useEffect(() => {
    if (typeof window !== "undefined" && profileCompleteness) {
      localStorage.setItem("profileCompleteness", JSON.stringify(profileCompleteness));
    }
  }, [profileCompleteness]);

  useEffect(() => {
    if (typeof window !== "undefined" && assessmentState) {
      localStorage.setItem("assessmentState", JSON.stringify(assessmentState));
    }
  }, [assessmentState]);

  // Clear cache
  const refreshProfile = () => {
    setProfileCompleteness(null);
    setProfileData(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("profileData");
      localStorage.removeItem("profileCompleteness");
    }
  };

  const clearProfile = () => {
    refreshProfile();
  };

  const refetch = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [profileRes, completenessRes] = await Promise.all([
        fetch(`${CANDIDATE_BASE}/profile`, { method: "GET", credentials: "include", headers }),
        fetch(`${CANDIDATE_BASE}/completeness`, { method: "GET", credentials: "include", headers }),
      ]);

      if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
      if (!completenessRes.ok) throw new Error(`Completeness fetch failed: ${completenessRes.status}`);

      const profileJson = await profileRes.json();
      const completenessJson = await completenessRes.json();

      const newProfileData = profileJson?.data?.profile || profileJson?.data || profileJson;
      const newCompletenessData = completenessJson?.data || completenessJson;

      setProfileData(newProfileData);
      setProfileCompleteness(newCompletenessData);
      setDataVersion(prev => prev + 1);

      if (typeof window !== "undefined") {
        localStorage.setItem("profileData", JSON.stringify(newProfileData));
        localStorage.setItem("profileCompleteness", JSON.stringify(newCompletenessData));
      }
    } catch (error) {
      console.error("ProfileContext.refetch error:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("profileData");
        localStorage.removeItem("profileCompleteness");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ ADDED: Force refresh function
  const forceRefresh = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("profileData");
      localStorage.removeItem("profileCompleteness");
    }
    await refetch();
  }, [refetch]);


  const setAssessmentState = useCallback((newState: any) => {
    setAssessmentStateInternal((prev: any) => ({ ...prev, ...newState }));
  }, []);

  const updateAssessmentProgress = useCallback((progress: { currentQuestionIndex: number; timeElapsed: number }) => {
    setAssessmentStateInternal((prev: any) => ({
      ...prev,
      currentAssessment: prev.currentAssessment
        ? {
            ...prev.currentAssessment,
            currentQuestionIndex: progress.currentQuestionIndex,
            timeElapsed: progress.timeElapsed,
          }
        : null,
    }));
  }, []);

  const clearAssessmentState = useCallback(() => {
    setAssessmentStateInternal((prev: any) => {
      const cleared = {
        currentAssessment: null,
        currentQuestion: null,
        assessmentHistory: prev.assessmentHistory,
        skillRecommendations: prev.skillRecommendations,
        loading: false,
        error: null,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("assessmentState", JSON.stringify(cleared));
      }
      return cleared;
    });
  }, []);

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
        refetch,
        clearProfile,
        loading,
        setLoading,
        dataVersion,
        forceRefresh, // ✅ ADDED
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
};