// controller/candidate/profile/badge.controller.ts

import { Request, Response } from 'express';
import { badgeService } from '../../../services/candidate/profile/badge.service';
import { APIResponse } from '../../../types/candidate.types';

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