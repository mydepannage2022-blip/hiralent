// components/candidate/profile/badges/badgeIcons.ts

import type { LucideIcon } from "lucide-react";
import {
  Award,
  UserCheck,
  ShieldCheck,
  FileCheck,
  TrendingUp,
  Target,
  Medal,
  Clock,
  Zap,
  BadgeCheck,
} from "lucide-react";

export type BadgeLike = {
  badge_id: string;
  category?: string;
};

export const BADGE_ICON_BY_ID: Record<string, LucideIcon> = {
  // Profile Master
  "a0b1982d-2ef9-4bd9-8248-c2bf1fc0ce0c": UserCheck,

  // Skill Expert
  "a0efbb06-748b-4943-99c3-714b1c7840da": Target,

  // Top 10%
  "7e7d32ef-3a6a-4ad4-81f6-fabcd0d9fdc3": Medal,

  // Certified Professional
  "063b3311-5e9e-4f2b-b7ca-f1960cbe750a": FileCheck,

  // Verified Identity
  "46bf5f12-e7e8-43a9-a632-f6ca7c252816": ShieldCheck,

  // Early Bird
  "db0d7f6a-d79e-42d0-b590-3f3789396dbf": Clock,

  // Assessment Champion
  "14b89186-d872-4fdc-bbbf-d0cfc4f6d1a0": Zap,

  // Consistent Performer
  "3b319dd6-7854-4c85-8706-33397f98b5c8": TrendingUp,
};

export const FALLBACK_ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  profile: UserCheck,
  skills: Target,
  achievement: Medal,
  credentials: FileCheck,
  verification: ShieldCheck,
  special: BadgeCheck,
};

export function getBadgeIcon(badge: BadgeLike): LucideIcon {
  return (
    BADGE_ICON_BY_ID[badge.badge_id] ||
    (badge.category ? FALLBACK_ICON_BY_CATEGORY[badge.category] : undefined) ||
    Award
  );
}
