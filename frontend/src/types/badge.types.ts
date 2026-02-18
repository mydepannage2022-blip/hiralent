// types/badge.types.ts

export interface BadgeProgress {
  current: number;
  required: number;
  percentage: number;
}

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: 'profile' | 'skills' | 'achievement' | 'credentials' | 'verification' | 'special';
  is_earned: boolean;
  awarded_at?: Date | string | null;
  progress?: BadgeProgress;
}

export const BADGE_CATEGORY_COLORS: Record<string, string> = {
  profile: 'bg-blue-100 text-blue-700 border-blue-200',
  skills: 'bg-purple-100 text-purple-700 border-purple-200',
  achievement: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  credentials: 'bg-green-100 text-green-700 border-green-200',
  verification: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  special: 'bg-pink-100 text-pink-700 border-pink-200',
};

export const BADGE_CATEGORY_LABELS: Record<string, string> = {
  profile: 'Profile',
  skills: 'Skills',
  achievement: 'Achievement',
  credentials: 'Credentials',
  verification: 'Verification',
  special: 'Special',
};