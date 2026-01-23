// controller/candidate/profile/certification.controller.ts

import { Request, Response } from 'express';
import { certificationService } from '../../../services/candidate/profile/certification.service';
import { APIResponse } from '../../../types/candidate.types';

export const addCertificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await certificationService.addCertification(req.user.user_id, req.body);
    res.status(result.success ? 201 : 400).json(result as any);
  } catch (error: any) {
    console.error('addCertificationController error:', error);
    res.status(500).json({ success: false, message: 'Failed to add certification', error: error.message } as APIResponse);
  }
};

export const listCertificationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const result = await certificationService.listCertifications(req.user.user_id);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error('listCertificationsController error:', error);
    res.status(500).json({ success: false, message: 'Failed to list certifications', error: error.message } as APIResponse);
  }
};

export const deleteCertificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponse);
      return;
    }

    const certificationId = req.params.certificationId;
    const result = await certificationService.deleteCertification(req.user.user_id, certificationId);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error('deleteCertificationController error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete certification', error: error.message } as APIResponse);
  }
};