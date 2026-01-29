// lib/profile/badge.queries.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, BadgeResponse, BadgeEvaluationResponse } from '@/src/types/badge.types';

// API base URL - adjust according to your setup
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Fetch all badges with earned status
 */
async function fetchBadges(): Promise<Badge[]> {
  const token = localStorage.getItem('token'); // Adjust based on your auth setup
  
  const response = await fetch(`${API_URL}/api/candidates/profile/badges`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch badges');
  }

  const data: BadgeResponse = await response.json();
  return data.data.badges;
}

/**
 * Trigger badge evaluation
 */
async function evaluateBadges(): Promise<BadgeEvaluationResponse> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/candidates/profile/badges/evaluate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to evaluate badges');
  }

  return response.json();
}

/**
 * Hook: Fetch badges
 */
export function useBadges() {
  return useQuery({
    queryKey: ['candidateBadges'],
    queryFn: fetchBadges,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook: Evaluate badges (trigger re-evaluation)
 */
export function useEvaluateBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: evaluateBadges,
    onSuccess: () => {
      // Invalidate and refetch badges
      queryClient.invalidateQueries({ queryKey: ['candidateBadges'] });
    },
  });
}

/**
 * Hook: Get earned badges only
 */
export function useEarnedBadges() {
  const { data, ...rest } = useBadges();
  
  return {
    data: data?.filter(badge => badge.is_earned) || [],
    ...rest,
  };
}

/**
 * Hook: Get locked badges only
 */
export function useLockedBadges() {
  const { data, ...rest } = useBadges();
  
  return {
    data: data?.filter(badge => !badge.is_earned) || [],
    ...rest,
  };
}

/**
 * Hook: Get badges by category
 */
export function useBadgesByCategory(category: Badge['category']) {
  const { data, ...rest } = useBadges();
  
  return {
    data: data?.filter(badge => badge.category === category) || [],
    ...rest,
  };
}