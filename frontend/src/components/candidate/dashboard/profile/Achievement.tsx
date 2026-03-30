// components/candidate/profile/Achievement.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_earned: boolean;
  awarded_at?: string;
  progress?: {
    current: number;
    required: number;
    percentage: number;
  };
}

interface AchievementProps {
  candidateId?: string;
}

const Achievement: React.FC<AchievementProps> = ({ candidateId }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBadges();
  }, [candidateId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from localStorage
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No auth token found');
        setError('Authentication required');
        setLoading(false);
        return;
      }

      console.log('🎯 Fetching badges from API...');

      const response = await fetch('http://localhost:5000/api/candidates/profile/badges', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Failed to fetch badges: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Badges data received:', data);

      if (data.success && data.data?.badges) {
        setBadges(data.data.badges);
        console.log('🏆 Total badges:', data.data.badges.length);
        console.log('✨ Earned badges:', data.data.badges.filter((b: Badge) => b.is_earned).length);
      } else {
        console.warn('⚠️ Unexpected data format:', data);
        setBadges([]);
      }

    } catch (err: any) {
      console.error('❌ Error fetching badges:', err);
      setError(err.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  // Separate earned and locked badges
  const earnedBadges = badges.filter(b => b.is_earned);
  const lockedBadges = badges.filter(b => !b.is_earned);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading achievements...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium mb-2">Failed to load achievements</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchBadges}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no badges earned yet)
  if (earnedBadges.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          </div>
          <Link 
            href="/candidate/achievements"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-base font-semibold text-gray-900 mb-2">No badges yet</h4>
          <p className="text-sm text-gray-600 mb-4">
            Complete your profile to start earning achievements
          </p>
          
          {/* Show available badges to earn */}
          {lockedBadges.length > 0 && (
            <div className="mt-6 text-left">
              <p className="text-xs font-semibold text-gray-700 mb-3">Available Badges:</p>
              <div className="grid grid-cols-2 gap-2">
                {lockedBadges.slice(0, 4).map((badge) => (
                  <div
                    key={badge.badge_id}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200"
                  >
                    <span className="text-xl opacity-40">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-600 truncate">{badge.name}</p>
                      {badge.progress && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${badge.progress.percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {badge.progress.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success state - show earned badges
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {earnedBadges.length}
          </span>
        </div>
        <Link 
          href="/candidate/achievements"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <TrendingUp className="w-4 h-4" />
        </Link>
      </div>

      {/* Earned Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {earnedBadges.slice(0, 6).map((badge) => (
          <div
            key={badge.badge_id}
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 hover:border-blue-300 transition-all hover:shadow-lg"
          >
            {/* Badge Icon */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-2xl">{badge.icon}</span>
            </div>

            {/* Badge Name */}
            <h4 className="text-sm font-semibold text-gray-900 text-center mb-1">
              {badge.name}
            </h4>

            {/* Badge Category */}
            <p className="text-xs text-gray-600 text-center mb-2">
              {badge.category}
            </p>

            {/* Awarded Date */}
            {badge.awarded_at && (
              <p className="text-[10px] text-gray-500 text-center">
                Earned {new Date(badge.awarded_at).toLocaleDateString()}
              </p>
            )}

            {/* Tooltip */}
            <div className="absolute inset-x-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              {badge.description}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        ))}
      </div>

      {/* Show more indicator */}
      {earnedBadges.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href="/candidate/achievements"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            +{earnedBadges.length - 6} more badges
          </Link>
        </div>
      )}
    </div>
  );
};

export default Achievement;