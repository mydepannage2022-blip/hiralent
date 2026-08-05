import { Request, Response } from 'express';
import * as adminAuthService from '../../services/admin.auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { BadRequestError, UnauthorizedError } from '../../errors/httpErrors';

// Session 1: superadmin auth now uses the standard envelope { success:true, data }
// (was the ad-hoc { ok:true, ...result }). The MFA flow fields (tempToken, mfaSetup,
// secret, sessionToken) live under `data`.

export const adminLoginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new BadRequestError('Email and password required');

  try {
    const result = await adminAuthService.adminLogin(email, password);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new UnauthorizedError(error?.message || 'Login failed');
  }
};

export const setupMFAController = async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  if (!tempToken) throw new BadRequestError('Temporary token required');

  try {
    const result = await adminAuthService.setupMFA(tempToken);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new BadRequestError(error?.message || 'Failed to set up MFA');
  }
};

export const verifyMFAController = async (req: Request, res: Response) => {
  const { tempToken, mfaToken } = req.body;
  if (!tempToken || !mfaToken) throw new BadRequestError('Temporary token and MFA code required');

  try {
    const result = await adminAuthService.verifyMFA(tempToken, mfaToken);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new UnauthorizedError(error?.message || 'MFA verification failed');
  }
};
