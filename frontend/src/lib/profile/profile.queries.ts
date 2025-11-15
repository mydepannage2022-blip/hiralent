import React from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getProfileCompleteness, 
  getCandidateProfile,
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
  uploadApplicationResume,
  BasicInfoData,
  SkillData,
  ExperienceData,
  EducationData,
  SocialLinkData,
  JobBenefitData } from './profile.api';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';

export const useProfileCompleteness = () => {
  const { setProfileCompleteness } = useProfile();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profileCompleteness'],
    queryFn: async () => {
      try {
        const data = await getProfileCompleteness();
        console.log('Profile completeness loaded:', data);
        
        if (data.success) {
          setProfileCompleteness(data);
        }
        
        return data;
      } catch (error: any) {
        console.error('Profile completeness failed:', error);

        if (error?.response?.status === 401) {
          console.log('Unauthorized when loading profile completeness');

          // If we already have a user in-memory (signup just happened and the
          // client persisted the user before the cookie is accepted by the
          // browser), avoid an immediate redirect to /auth/login which would
          // clear UI state. Instead, return null and let higher-level flows
          // handle retry/login. Only force a redirect when there is no known
          // in-memory user.
          if (!user) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUser');
            }
            window.location.href = '/auth/login';
            return null;
          }

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

const refreshProfileData = async (setProfileData: any , updateUser: any) => {
  try {
    const profileResponse = await getCandidateProfile();
    if (profileResponse.success) {
      setProfileData(profileResponse.data.profile);
      updateUser(profileResponse.data.user);
      
      console.log('User data refreshed:', profileResponse.data.user);
      console.log('Profile data refreshed:', profileResponse.data.profile);
    }
  } catch (error) {
    console.error('Failed to refresh profile data:', error);
  }
};

// ==================== BASIC INFO HOOKS ====================

export const useUpdateBasicInfo = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 

  return useMutation({
    mutationFn: updateBasicInfo,
    onSuccess: async (data) => {
      console.log('Basic info updated:', data);
      toast.success('Basic information updated successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      await refreshProfileData(setProfileData , updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update basic info';
      console.error('Basic info update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== SKILLS HOOKS ====================

export const useUpdateSkills = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: updateSkills,
    onSuccess: async (data) => {
      console.log('Skills updated:', data);
      toast.success('Skills updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update skills';
      console.error('Skills update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useAddSkill = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: addSkill,
    onSuccess: async (data) => {
      console.log('Skill added:', data);
      toast.success('Skill added successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add skill';
      console.error('Add skill failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: deleteSkill,
    onSuccess: async (data) => {
      console.log('Skill deleted:', data);
      toast.success('Skill deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to delete skill';
      console.error('Delete skill failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== EXPERIENCE HOOKS ====================

export const useUpdateExperience = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: updateExperience,
    onSuccess: async (data) => {
      console.log('Experience updated:', data);
      toast.success('Experience updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update experience';
      console.error('Experience update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useAddExperience = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: addExperience,
    onSuccess: async (data) => {
      console.log('Experience added:', data);
      toast.success('Experience added successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add experience';
      console.error('Add experience failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== EDUCATION HOOKS ====================

export const useUpdateEducation = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: updateEducation,
    onSuccess: async (data) => {
      console.log('Education updated:', data);
      toast.success('Education updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update education';
      console.error('Education update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useAddEducation = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: addEducation,
    onSuccess: async (data) => {
      console.log('Education added:', data);
      toast.success('Education added successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add education';
      console.error('Add education failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== SOCIAL LINKS HOOKS ====================

export const useUpdateLinks = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: updateLinks,
    onSuccess: async (data) => {
      console.log('Links updated:', data);
      toast.success('Social links updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update links';
      console.error('Links update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useAddLink = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: addLink,
    onSuccess: async (data) => {
      console.log('Link added:', data);
      toast.success('Social link added successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add link';
      console.error('Add link failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useDeleteLink = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: deleteLink,
    onSuccess: async (data) => {
      console.log('Link deleted:', data);
      toast.success('Social link deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to delete link';
      console.error('Delete link failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== JOB BENEFITS HOOKS ====================

export const useUpdateJobBenefits = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: updateJobBenefits,
    onSuccess: async (data) => {
      console.log('Job benefits updated:', data);
      toast.success('Job benefits updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update job benefits';
      console.error('Job benefits update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== PROFILE PICTURE HOOK ====================

export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: async (data) => {
      console.log('Profile picture uploaded:', data);
      toast.success('Profile picture uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to upload profile picture';
      console.error('Profile picture upload failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

// ==================== BULK UPDATE HOOK ====================

export const useBulkUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: bulkUpdateProfile,
    onSuccess: async (data) => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] });
      
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update profile';
      console.error('Bulk update failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};


export const useUploadApplicationResume = () => {
  const queryClient = useQueryClient();
  const { setProfileData } = useProfile();
  const { updateUser } = useAuth(); 
  
  return useMutation({
    mutationFn: uploadApplicationResume,
    onSuccess: async (data) => {
      console.log('Application resume uploaded:', data);
      toast.success('Application resume uploaded successfully!');
      
      // Refresh profile data to get updated resume_application_url
      await refreshProfileData(setProfileData, updateUser);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to upload application resume';
      console.error('Application resume upload failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};