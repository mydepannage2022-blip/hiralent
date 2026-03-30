// components/candidate/profile/badges/BadgeSection.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEarnedBadges } from "@/src/lib/profile/badge.queries";
import {
  Award,
  ChevronRight,
  Sparkles,
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
import type { LucideIcon } from "lucide-react";

type Badge = {
  badge_id: string;
  name: string;
  description: string;
  category: string;
  is_earned: boolean;
  awarded_at?: string;
  progress?: { current: number; required: number; percentage: number };
};

const BADGE_ICON_BY_ID: Record<string, LucideIcon> = {
  "a0b1982d-2ef9-4bd9-8248-c2bf1fc0ce0c": UserCheck, // Profile Master
  "a0efbb06-748b-4943-99c3-714b1c7840da": Target, // Skill Expert
  "7e7d32ef-3a6a-4ad4-81f6-fabcd0d9fdc3": Medal, // Top 10%
  "063b3311-5e9e-4f2b-b7ca-f1960cbe750a": FileCheck, // Certified Professional
  "46bf5f12-e7e8-43a9-a632-f6ca7c252816": ShieldCheck, // Verified Identity
  "db0d7f6a-d79e-42d0-b590-3f3789396dbf": Clock, // Early Bird
  "14b89186-d872-4fdc-bbbf-d0cfc4f6d1a0": Zap, // Assessment Champion
  "3b319dd6-7854-4c85-8706-33397f98b5c8": TrendingUp, // Consistent Performer
};

const FALLBACK_ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  profile: UserCheck,
  skills: Target,
  achievement: Medal,
  credentials: FileCheck,
  verification: ShieldCheck,
  special: BadgeCheck,
};

function getBadgeIcon(badge: Badge): LucideIcon {
  return (
    BADGE_ICON_BY_ID[badge.badge_id] ||
    FALLBACK_ICON_BY_CATEGORY[badge.category] ||
    Award
  );
}

function getIconTint(category: string) {
  // subtle “playful” color without gradients
  switch (category) {
    case "skills":
      return "text-indigo-600 bg-indigo-50 border-indigo-100";
    case "achievement":
      return "text-amber-600 bg-amber-50 border-amber-100";
    case "credentials":
      return "text-emerald-600 bg-emerald-50 border-emerald-100";
    case "verification":
      return "text-sky-600 bg-sky-50 border-sky-100";
    case "special":
      return "text-rose-600 bg-rose-50 border-rose-100";
    case "profile":
    default:
      return "text-blue-600 bg-blue-50 border-blue-100";
  }
}

export const BadgeSection: React.FC = () => {
  const { data: earnedBadges = [], isLoading } = useEarnedBadges();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-11 w-11 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="mt-4 h-10 rounded-xl bg-gray-100" />
      </div>
    );
  }

  const preview = earnedBadges.slice(0, 5);
  const remainingCount = Math.max(0, earnedBadges.length - 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">
              Achievements
            </p>
            <p className="text-xs text-gray-500">Your earned badges</p>
          </div>
        </div>

        <Link
          href="/candidate/dashboard/candidate-profile/badges"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View All <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {earnedBadges.length > 0 ? (
        <>
          {/* Icon grid (clean + playful) */}
          <div className="flex items-center gap-2">
            {preview.map((badge, idx) => {
              const Icon = getBadgeIcon(badge);
              const tint = getIconTint(badge.category);

              return (
                <motion.button
                  key={badge.badge_id}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`h-11 w-11 rounded-xl border ${tint} flex items-center justify-center transition-colors`}
                  title={badge.name}
                >
                  <Icon className="h-5 w-5" />
                </motion.button>
              );
            })}

            {remainingCount > 0 && (
              <div
                className="h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center"
                title={`${remainingCount} more badges`}
              >
                <span className="text-xs font-bold text-gray-700">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>

          {/* Footer stats (simple) */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                {earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""} earned
              </span>
            </div>

            <span className="text-xs text-gray-600">
              Keep going !
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white">
              <Award className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">No badges yet</p>
              <p className="mt-0.5 text-xs text-gray-600">
                Complete your profile & assessments to unlock badges.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeSection;
