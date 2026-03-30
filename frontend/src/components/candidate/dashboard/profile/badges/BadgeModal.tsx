"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, BADGE_CATEGORY_COLORS } from "@/src/types/badge.types";
import { BadgeProgress } from "./BadgeProgress";
import { X, Calendar, Target, TrendingUp } from "lucide-react";
import { getBadgeIcon } from "./badgeIcons";

interface BadgeModalProps {
  badge: Badge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({
  badge,
  isOpen,
  onClose,
}) => {
  if (!badge) return null;

  const Icon = getBadgeIcon(badge);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const categoryColor =
    BADGE_CATEGORY_COLORS[badge.category] || BADGE_CATEGORY_COLORS.profile;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="p-8">
                {/* Badge Icon */}
                <div className="mb-6 flex justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={`
                      flex h-32 w-32 items-center justify-center rounded-full shadow-lg
                      ${
                        badge.is_earned
                          ? "bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300"
                          : "bg-gray-100"
                      }
                    `}
                  >
                    <Icon
                      className={`h-14 w-14 ${
                        badge.is_earned ? "text-blue-700" : "text-gray-500"
                      }`}
                    />
                  </motion.div>
                </div>

                {/* Badge Name & Status */}
                <div className="mb-4 text-center">
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    {badge.name}
                  </h2>
                  <span
                    className={`
                    inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold
                    ${categoryColor}
                  `}
                  >
                    {badge.category.toUpperCase()}
                  </span>
                </div>

                {/* Description */}
                <p className="mb-6 text-center text-sm text-gray-600 leading-relaxed">
                  {badge.description}
                </p>

                {/* Status Section */}
                {badge.is_earned ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-900">
                          Badge Earned
                        </p>
                        {badge.awarded_at && (
                          <p className="text-xs text-emerald-700">
                            {formatDate(badge.awarded_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-4"
                  >
                    {/* Progress */}
                    {badge.progress && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-900">
                            Your Progress
                          </p>
                        </div>
                        <BadgeProgress progress={badge.progress} size="md" />
                      </div>
                    )}

                    {/* Unlock Tip */}
                    <div className="flex items-start gap-3 pt-3 border-t border-blue-200">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          How to Unlock
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {getUnlockTip(badge)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Helper function to generate unlock tips
function getUnlockTip(badge: Badge): string {
  if (badge.progress) {
    const remaining = badge.progress.required - badge.progress.current;
    return `Complete ${remaining} more to unlock this badge. Keep going!`;
  }

  const tips: Record<string, string> = {
    profile: "Complete all sections of your profile to 100%",
    skills: "Take skill assessments to validate your expertise",
    achievement: "Maintain high performance and quality standards",
    credentials: "Add professional certifications to your profile",
    verification: "Upload and verify all required documents",
    special: "This is a special limited-time achievement",
  };

  return tips[badge.category] || "Complete the requirements to unlock this badge";
}

export default BadgeModal;
