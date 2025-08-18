import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfileCompleteness } from './profile.api';
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
