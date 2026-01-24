// controller/candidate/profile/scoring.controller.ts

import { Request, Response } from 'express';
import { scoringService } from '../../../services/candidate/profile/scoring.service';
import { APIResponse } from '../../../types/candidate.types';

export const calculateScoreController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await scoringService.calculateScore(req.user.user_id);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error('calculateScoreController error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate score', error: error.message } as APIResponse);
  }
};

export const getScoreController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await scoringService.getCurrentScore(req.user.user_id);
    res.status(result.success ? 200 : 404).json(result as any);
  } catch (error: any) {
    console.error('getScoreController error:', error);
    res.status(500).json({ success: false, message: 'Failed to get score', error: error.message } as APIResponse);
  }
};

export const getScoreHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await scoringService.getScoreHistory(req.user.user_id, limit);
    res.status(result.success ? 200 : 404).json(result as any);
  } catch (error: any) {
    console.error('getScoreHistoryController error:', error);
    res.status(500).json({ success: false, message: 'Failed to get score history', error: error.message } as APIResponse);
  }
};