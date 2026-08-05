// services/candidate/profile/badge.trigger.ts

import { badgeService } from './badge.service';
import { completenessService } from './completeness.service';
import prisma from '../../../lib/prisma';


/**
 * Auto-trigger badge evaluation after profile updates
 * This should be called after ANY profile update operation
 */
export async function autoEvaluateBadges(candidateId: string): Promise<void> {
  try {
    console.log(`🔄 Auto-evaluating badges for candidate: ${candidateId}`);
    
    // 1. Always recalculate completeness first (this ensures fresh data)
    await completenessService.calculateCompleteness(candidateId);
    
    // 2. Get current state before evaluation (for logging)
    const beforeBadges = await prisma.badgeAward.count({
      where: { 
        candidate_id: candidateId, 
        is_active: true 
      }
    });
    
    const completeness = await prisma.profileCompleteness.findUnique({
      where: { candidate_id: candidateId }
    });
    
    console.log(`📊 Before evaluation:`, {
      earnedBadges: beforeBadges,
      completeness: completeness?.overall_score || 0
    });
    
    // 3. Evaluate badges silently (won't throw errors to caller)
    const result = await badgeService.evaluateBadges(candidateId);
    
    if (result.success) {
      const afterBadges = await prisma.badgeAward.count({
        where: { 
          candidate_id: candidateId, 
          is_active: true 
        }
      });
      
      console.log(`✅ Auto badge evaluation completed for: ${candidateId}`, {
        earnedBefore: beforeBadges,
        earnedAfter: afterBadges,
        newAwards: afterBadges - beforeBadges
      });
    } else {
      console.error(`❌ Auto badge evaluation failed for ${candidateId}:`, result.message);
    }
  } catch (error) {
    console.error(`🔥 Auto badge evaluation crashed for ${candidateId}:`, error);
    // Don't throw - we don't want badge failures to break profile updates
  }
}

/**
 * Quick badge evaluation for profile updates (non-blocking)
 */
export function triggerAutoBadgeEvaluation(candidateId: string): void {
  // Run in background without awaiting
  setImmediate(async () => {
    try {
      await autoEvaluateBadges(candidateId);
    } catch (error) {
      console.error('Background badge evaluation failed:', error);
    }
  });
}