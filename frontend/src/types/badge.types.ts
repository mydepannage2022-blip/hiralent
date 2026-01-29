// types/badge.types.ts

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  category: 'profile' | 'skills' | 'achievement' | 'credentials' | 'verification' | 'special';
  is_earned: boolean;
  awarded_at?: Date | string;
  progress?: BadgeProgress;
}

export interface BadgeProgress {
  current: number;
  required: number;
  percentage: number;
}

export interface BadgeEvaluation {
  badge_id: string;
  should_have: boolean;
  currently_has: boolean;
  action: 'award' | 'revoke' | 'none';
}

export interface BadgeResponse {
  success: boolean;
  data: {
    badges: Badge[];
  };
  message?: string;
}

export interface BadgeEvaluationResponse {
  success: boolean;
  data: {
    evaluations: BadgeEvaluation[];
    badges: Badge[];
  };
  message?: string;
}

// Badge category colors for UI
export const BADGE_CATEGORY_COLORS: Record<Badge['category'], string> = {
  profile: 'bg-blue-100 text-blue-700 border-blue-200',
  skills: 'bg-purple-100 text-purple-700 border-purple-200',
  achievement: 'bg-amber-100 text-amber-700 border-amber-200',
  credentials: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  verification: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  special: 'bg-rose-100 text-rose-700 border-rose-200',
};

// Badge category icons
export const BADGE_CATEGORY_ICONS: Record<Badge['category'], string> = {
  profile: '👤',
  skills: '🎯',
  achievement: '🏆',
  credentials: '📜',
  verification: '✅',
  special: '⭐',
};