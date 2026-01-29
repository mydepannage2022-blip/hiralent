// components/candidate/profile/badges/BadgeSection.tsx

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useEarnedBadges } from '@/src/lib/profile/badge.queries';
import { Award, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * Compact Badge Section for Profile Page
 * Shows earned badges count and preview
 */
export const BadgeSection: React.FC = () => {
  const { data: earnedBadges, isLoading } = useEarnedBadges();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-16 bg-gray-200 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  const displayBadges = earnedBadges.slice(0, 5);
  const remainingCount = Math.max(0, earnedBadges.length - 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Achievements</h3>
        </div>

        <Link
          href="/profile/badges"
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Badge Preview */}
      {earnedBadges.length > 0 ? (
        <div className="space-y-4">
          {/* Badge Icons Row */}
          <div className="flex items-center gap-2">
            {displayBadges.map((badge, index) => (
              <motion.div
                key={badge.badge_id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200,
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-2xl shadow-md cursor-pointer"
                title={badge.name}
              >
                {badge.icon}
              </motion.div>
            ))}

            {/* More Badges Indicator */}
            {remainingCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
              >
                +{remainingCount}
              </motion.div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {earnedBadges.length} Badge{earnedBadges.length !== 1 ? 's' : ''} Earned
              </span>
            </div>
            <span className="text-xs text-blue-700">Keep it up! 🎉</span>
          </div>
        </div>
      ) : (
        /* No Badges Yet */
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
          <Award className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No badges yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Complete your profile to start earning achievements
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default BadgeSection;