// lib/profile/badge.queries.ts

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Badge } from '@/src/types/badge.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface BadgesResponse {
  success: boolean;
  data: {
    badges: Badge[];
  };
  message?: string;
}

/**
 * Fetch all badges (earned + locked) for the current user
 */
export const useBadges = (): UseQueryResult<Badge[], Error> => {
  return useQuery<Badge[], Error>({
    queryKey: ['badges'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('🎯 [BADGES] Fetching badges from API...');

      const response = await fetch(`${API_BASE_URL}/api/v1/candidates/profile/badges`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [BADGES] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [BADGES] API Error:', errorText);
        throw new Error(`Failed to fetch badges: ${response.status}`);
      }

      const data: BadgesResponse = await response.json();
      console.log('✅ [BADGES] Data received:', data);

      if (!data.success || !data.data?.badges) {
        throw new Error('Invalid response format from badges API');
      }

      console.log(`🏆 [BADGES] Total badges: ${data.data.badges.length}`);
      console.log(`✨ [BADGES] Earned badges: ${data.data.badges.filter(b => b.is_earned).length}`);

      return data.data.badges;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

/**
 * Fetch only earned badges for the current user
 */
export const useEarnedBadges = (): UseQueryResult<Badge[], Error> => {
  const { data: allBadges, ...queryResult } = useBadges();

  return {
    ...queryResult,
    data: allBadges?.filter(badge => badge.is_earned) || [],
  } as UseQueryResult<Badge[], Error>;
};

/**
 * Fetch only locked badges for the current user
 */
export const useLockedBadges = (): UseQueryResult<Badge[], Error> => {
  const { data: allBadges, ...queryResult } = useBadges();

  return {
    ...queryResult,
    data: allBadges?.filter(badge => !badge.is_earned) || [],
  } as UseQueryResult<Badge[], Error>;
};

/**
 * Get badge stats
 */
export const useBadgeStats = () => {
  const { data: badges, isLoading, error } = useBadges();

  const earnedCount = badges?.filter(b => b.is_earned).length || 0;
  const lockedCount = badges?.filter(b => !b.is_earned).length || 0;
  const totalCount = badges?.length || 0;
  const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return {
    earnedCount,
    lockedCount,
    totalCount,
    percentage,
    isLoading,
    error,
  };
};