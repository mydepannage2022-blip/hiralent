// components/candidate/profile/badges/BadgeCard.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge, BADGE_CATEGORY_COLORS } from '@/src/types/badge.types';
import { BadgeProgress } from './BadgeProgress';
import { Lock, CheckCircle, Calendar } from 'lucide-react';

interface BadgeCardProps {
  badge: Badge;
  onClick?: () => void;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const categoryColor = BADGE_CATEGORY_COLORS[badge.category] || BADGE_CATEGORY_COLORS.profile;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`
        relative rounded-2xl border bg-white p-5 transition-all duration-300 cursor-pointer
        ${badge.is_earned 
          ? 'border-blue-200 shadow-md hover:shadow-xl' 
          : 'border-gray-200 shadow-sm hover:shadow-md opacity-75 hover:opacity-100'
        }
      `}
    >
      {/* Lock/Check Icon Badge */}
      <div className="absolute -top-2 -right-2 z-10">
        {badge.is_earned ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg"
          >
            <CheckCircle className="h-4 w-4 text-white" />
          </motion.div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300">
            <Lock className="h-3.5 w-3.5 text-gray-600" />
          </div>
        )}
      </div>

      {/* Badge Icon */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={badge.is_earned ? {
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          } : {}}
          transition={{ duration: 0.5 }}
          className={`
            mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl
            ${badge.is_earned 
              ? 'bg-gradient-to-br from-blue-100 to-blue-200 shadow-md' 
              : 'bg-gray-100 grayscale'
            }
          `}
        >
          {badge.icon}
        </motion.div>

        {/* Badge Name */}
        <h3 className={`
          mb-1.5 text-sm font-bold
          ${badge.is_earned ? 'text-gray-900' : 'text-gray-600'}
        `}>
          {badge.name}
        </h3>

        {/* Badge Description */}
        <p className={`
          mb-3 text-xs leading-relaxed
          ${badge.is_earned ? 'text-gray-600' : 'text-gray-500'}
        `}>
          {badge.description}
        </p>

        {/* Category Tag */}
        <span className={`
          inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium
          ${categoryColor}
        `}>
          {badge.category}
        </span>

        {/* Progress Bar (for locked badges) */}
        {!badge.is_earned && badge.progress && (
          <div className="mt-4 w-full">
            <BadgeProgress progress={badge.progress} size="sm" />
          </div>
        )}

        {/* Earned Date (for earned badges) */}
        {badge.is_earned && badge.awarded_at && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-500"
          >
            <Calendar className="h-3 w-3" />
            <span>Earned {formatDate(badge.awarded_at)}</span>
          </motion.div>
        )}
      </div>

      {/* Shine Effect on Hover (Earned Badges Only) */}
      {badge.is_earned && isHovered && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{ transform: 'skewX(-20deg)' }}
        />
      )}
    </motion.div>
  );
};

export default BadgeCard;