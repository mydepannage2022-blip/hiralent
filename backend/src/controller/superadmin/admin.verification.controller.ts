import { Request, Response } from 'express';
import * as adminVerificationService from '../../services/admin.verification.service';

// GET /admin/verifications/pending
export const getPendingVerificationsController = async (req: Request, res: Response) => {
  try {
    const pending = await adminVerificationService.getPendingCompanyVerifications();
    
    res.json({ 
      ok: true, 
      count: pending.length,
      data: pending 
    });
  } catch (error: any) {
    console.error('[getPendingVerifications] error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// GET /admin/verifications/stats
export const getVerificationStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await adminVerificationService.getVerificationStats();
    
    res.json({ 
      ok: true, 
      data: stats 
    });
  } catch (error: any) {
    console.error('[getVerificationStats] error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

// GET /admin/verifications/:company_id
export const getCompanyVerificationDetailsController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    
    const details = await adminVerificationService.getCompanyVerificationDetails(company_id);
    
    res.json({ 
      ok: true, 
      data: details 
    });
  } catch (error: any) {
    console.error('[getCompanyVerificationDetails] error:', error);
    res.status(404).json({ ok: false, error: error.message });
  }
};

// POST /admin/verifications/approve/:company_id
export const approveVerificationController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    const { notes } = req.body;
    const admin_id = req.admin?.user_id;
    
    if (!admin_id) {
      return res.status(401).json({ ok: false, error: 'Admin not authenticated' });
    }
    
    const result = await adminVerificationService.approveCompanyVerification(
      company_id,
      admin_id,
      notes
    );
    
    res.json({ 
      ok: true, 
      message: 'Company verification approved successfully',
      data: result
    });
  } catch (error: any) {
    console.error('[approveVerification] error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
};

// POST /admin/verifications/reject/:company_id
export const rejectVerificationController = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.params;
    const { reason } = req.body;
    const admin_id = req.admin?.user_id;
    
    if (!admin_id) {
      return res.status(401).json({ ok: false, error: 'Admin not authenticated' });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Rejection reason is required' 
      });
    }
    
    const result = await adminVerificationService.rejectCompanyVerification(
      company_id,
      admin_id,
      reason
    );
    
    res.json({ 
      ok: true, 
      message: 'Verification sent back for re-submission',
      data: result
    });
  } catch (error: any) {
    console.error('[rejectVerification] error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
};
