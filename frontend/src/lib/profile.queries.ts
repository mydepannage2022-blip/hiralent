import React from 'react';
import { useMutation, useQueryClient ,useQuery } from '@tanstack/react-query';
import { getProfileCompleteness, 
  updateBasicInfo,
  updateSkills,
  addSkill,
  deleteSkill,
  updateExperience,
  addExperience,
  updateEducation,
  addEducation,
  updateLinks,
  addLink,
  deleteLink,
  updateJobBenefits,
  uploadProfilePicture,
  bulkUpdateProfile,
  BasicInfoData,
  SkillData,
  ExperienceData,
  EducationData,
  SocialLinkData,
  JobBenefitData } from './profile.api';
import { useProfile } from '../context/ProfileContext';

export const useProfileCompleteness = () => {
  const { setProfileCompleteness } = useProfile();

  return useQuery({
    queryKey: ['profileCompleteness'],
    queryFn: async () => {
      try {
        const data = await getProfileCompleteness();
        console.log('✅ Profile completeness loaded:', data);
        
        if (data.success) {
          setProfileCompleteness(data);
        }
        
        return data;
      } catch (error: any) {
        console.error('❌ Profile completeness failed:', error);
        
        if (error?.response?.status === 401) {
          console.log('🔑 401 Unauthorized - redirecting to login');
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
          
          window.location.href = '/auth/login';
          return null;
        }
        
        throw error; 
      }
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,  
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};


// ==================== BASIC INFO HOOKS ====================

export const useUpdateBasicInfo = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateBasicInfo,
    onSuccess: (data) => {
      console.log('✅ Basic info updated:', data);
      // Refresh profile completeness
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Basic info update failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== SKILLS HOOKS ====================

export const useUpdateSkills = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateSkills,
    onSuccess: (data) => {
      console.log('✅ Skills updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Skills update failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useAddSkill = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: addSkill,
    onSuccess: (data) => {
      console.log('✅ Skill added:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Add skill failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: deleteSkill,
    onSuccess: (data) => {
      console.log('✅ Skill deleted:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Delete skill failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== EXPERIENCE HOOKS ====================

export const useUpdateExperience = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateExperience,
    onSuccess: (data) => {
      console.log('✅ Experience updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Experience update failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useAddExperience = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: addExperience,
    onSuccess: (data) => {
      console.log('✅ Experience added:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Add experience failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== EDUCATION HOOKS ====================

export const useUpdateEducation = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateEducation,
    onSuccess: (data) => {
      console.log('✅ Education updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Education update failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useAddEducation = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: addEducation,
    onSuccess: (data) => {
      console.log('✅ Education added:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Add education failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== SOCIAL LINKS HOOKS ====================

export const useUpdateLinks = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateLinks,
    onSuccess: (data) => {
      console.log('✅ Links updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Links update failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useAddLink = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: addLink,
    onSuccess: (data) => {
      console.log('✅ Link added:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Add link failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useDeleteLink = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: deleteLink,
    onSuccess: (data) => {
      console.log('✅ Link deleted:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Delete link failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== JOB BENEFITS HOOKS ====================

export const useUpdateJobBenefits = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: updateJobBenefits,
    onSuccess: (data) => {
      console.log('✅ Job benefits updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Job benefits update failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== PROFILE PICTURE HOOK ====================

export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: (data) => {
      console.log('✅ Profile picture uploaded:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Profile picture upload failed:', error?.response?.data?.message || error.message);
    },
  });
};

// ==================== BULK UPDATE HOOK ====================

export const useBulkUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { refreshProfile } = useProfile();

  return useMutation({
    mutationFn: bulkUpdateProfile,
    onSuccess: (data) => {
      console.log('✅ Bulk profile updated:', data);
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      refreshProfile();
    },
    onError: (error: any) => {
      console.error('❌ Bulk update failed:', error?.response?.data?.message || error.message);
    },
  });
};