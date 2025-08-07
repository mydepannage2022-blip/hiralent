import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfileCompleteness } from './profile.api';
import { useProfile } from '../context/ProfileContext';

// Hook for fetching profile completeness
export const useProfileCompletenessWithContext = () => {
  const { setProfileCompleteness, setLoading } = useProfile();
  
  const query = useQuery({
    queryKey: ['profileCompleteness'],
    queryFn: getProfileCompleteness,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle success/error/loading in the hook itself
  React.useEffect(() => {
    if (query.data && query.data.success) {
      console.log('✅ Profile completeness loaded:', query.data);
      setProfileCompleteness(query.data);
    }
    setLoading(query.isLoading);
  }, [query.data, query.isLoading, setProfileCompleteness, setLoading]);

  // Handle errors
  React.useEffect(() => {
    if (query.error) {
      console.error('❌ Profile completeness failed:', query.error);
    }
  }, [query.error]);

  return query;
};