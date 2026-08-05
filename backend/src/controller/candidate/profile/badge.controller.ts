// controller/candidate/profile/badge.controller.ts

import { Request, Response } from 'express';
import { badgeService } from '../../../services/candidate/profile/badge.service';
import { APIResponse } from '../../../types/candidate.types';
import prisma from '../../../lib/prisma';

export const evaluateBadgesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await badgeService.evaluateBadges(req.user.user_id);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error('evaluateBadgesController error:', error);
    res.status(500).json({ success: false, message: 'Failed to evaluate badges', error: error.message } as APIResponse);
  }
};

export const listBadgesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await badgeService.listBadges(req.user.user_id);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error('listBadgesController error:', error);
    res.status(500).json({ success: false, message: 'Failed to list badges', error: error.message } as APIResponse);
  }
};
export const debugBadgeCriteriaController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const candidateId = req.user.user_id;
    
    const [badges, completeness, score, skills, certs, awards] = await Promise.all([
      prisma.badge.findMany({ where: { is_active: true } }),
      prisma.profileCompleteness.findUnique({ where: { candidate_id: candidateId } }),
      prisma.candidateScore.findUnique({ where: { candidate_id: candidateId } }),
      prisma.candidateSkill.findMany({ where: { candidate_id: candidateId, is_verified: true } }),
      prisma.certification.findMany({ where: { candidate_id: candidateId } }),
      prisma.badgeAward.findMany({ where: { candidate_id: candidateId, is_active: true } })
    ]);

    const candidateStats = {
      completeness: completeness?.overall_score || 0,
      score: score?.total_score || 0,
      verified_skills: skills.length,
      certifications: certs.length
    };

    const earnedBadges = awards.map(a => a.badge_id);
    
    const badgeChecks = badges.map(badge => {
      const criteria: any = badge.criteria || {};
      const isEarned = earnedBadges.includes(badge.badge_id);
      
      const checks = {
        completeness: criteria.completeness ? {
          required: criteria.completeness,
          actual: candidateStats.completeness,
          met: candidateStats.completeness >= criteria.completeness
        } : null,
        validated_skills: criteria.validated_skills_min ? {
          required: criteria.validated_skills_min,
          actual: candidateStats.verified_skills,
          met: candidateStats.verified_skills >= criteria.validated_skills_min
        } : null,
        score: criteria.score_min ? {
          required: criteria.score_min,
          actual: candidateStats.score,
          met: candidateStats.score >= criteria.score_min
        } : null,
        certifications: criteria.certifications_min ? {
          required: criteria.certifications_min,
          actual: candidateStats.certifications,
          met: candidateStats.certifications >= criteria.certifications_min
        } : null
      };

      const allCriteriaMet = Object.values(checks).every(check => 
        check === null || check.met === true
      );

      return {
        badge_id: badge.badge_id,
        name: badge.name,
        should_have: allCriteriaMet,
        currently_has: isEarned,
        needs_action: allCriteriaMet !== isEarned
      };
    });

    res.status(200).json({
      success: true,
      data: {
        candidate_stats: candidateStats,
        earned_badges: earnedBadges.length,
        total_badges: badges.length,
        badge_checks: badgeChecks,
        issues: badgeChecks.filter(b => b.needs_action)
      },
      message: 'Badge criteria debug completed'
    });
  } catch (error: any) {
    console.error('Error debugging badge criteria:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to debug badge criteria',
      error: error.message 
    } as APIResponse);
  }
};