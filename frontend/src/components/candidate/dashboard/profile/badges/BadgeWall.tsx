// components/candidate/profile/badges/BadgeWall.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useBadges } from '@/src/lib/profile/badge.queries';
import { Badge } from '@/src/types/badge.types';
import { BadgeCard } from './BadgeCard';
import { BadgeModal } from './BadgeModal';
import { Award, Lock, Sparkles, RefreshCw } from 'lucide-react';

export const BadgeWall: React.FC = () => {
  const { data: badges, isLoading, error, refetch } = useBadges();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'locked'>('all');

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedBadge(null), 300);
  };

  const earnedBadges = badges?.filter(b => b.is_earned) || [];
  const lockedBadges = badges?.filter(b => !b.is_earned) || [];

  const displayBadges = 
    activeTab === 'earned' ? earnedBadges :
    activeTab === 'locked' ? lockedBadges :
    badges || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600"
          />
          <p className="text-sm text-gray-600">Loading badges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">Failed to load badges. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Award className="h-6 w-6 text-blue-600" />
            Your Achievements
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Earn badges by completing your profile and reaching milestones
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-blue-600">{earnedBadges.length}</p>
            <p className="text-xs text-blue-700">Earned</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-gray-600">{lockedBadges.length}</p>
            <p className="text-xs text-gray-600">Locked</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`
            relative px-4 py-2 text-sm font-medium transition-colors
            ${activeTab === 'all' 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          All Badges
          {activeTab === 'all' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('earned')}
          className={`
            relative px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5
            ${activeTab === 'earned' 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Earned ({earnedBadges.length})
          {activeTab === 'earned' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('locked')}
          className={`
            relative px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5
            ${activeTab === 'locked' 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Lock className="h-3.5 w-3.5" />
          Locked ({lockedBadges.length})
          {activeTab === 'locked' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
      </div>

      {/* Badge Grid */}
      {displayBadges.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {displayBadges.map((badge, index) => (
            <motion.div
              key={badge.badge_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <BadgeCard
                badge={badge}
                onClick={() => handleBadgeClick(badge)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center">
          <Lock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No badges in this category</p>
          <p className="mt-1 text-xs text-gray-500">
            Complete your profile to start earning badges
          </p>
        </div>
      )}

      {/* Badge Detail Modal */}
      <BadgeModal
        badge={selectedBadge}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default BadgeWall;