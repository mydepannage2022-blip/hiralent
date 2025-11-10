import { Request, Response } from 'express';
import * as adminAuthService from '../../services/admin.auth.service';

export const adminLoginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Email and password required' 
      });
    }
    
    const result = await adminAuthService.adminLogin(email, password);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[adminLogin] error:', error);
    res.status(401).json({ ok: false, error: error.message });
  }
};

export const setupMFAController = async (req: Request, res: Response) => {
  try {
    const { tempToken } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Temporary token required' 
      });
    }
    
    const result = await adminAuthService.setupMFA(tempToken);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[setupMFA] error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
};

export const verifyMFAController = async (req: Request, res: Response) => {
  try {
    const { tempToken, mfaToken } = req.body;
    
    if (!tempToken || !mfaToken) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Temporary token and MFA code required' 
      });
    }
    
    const result = await adminAuthService.verifyMFA(tempToken, mfaToken);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[verifyMFA] error:', error);
    res.status(401).json({ ok: false, error: error.message });
  }
};
