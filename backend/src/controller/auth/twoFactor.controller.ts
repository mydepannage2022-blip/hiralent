import { Request, Response } from "express";
import {
  setup2FA,
  setupWithTempToken,
  enable2FA,
  disable2FA,
  verifyLogin2FA,
  verifyLoginWithRecoveryCode,
} from "../../services/auth/twoFactor.service";
import { sendSuccess } from "../../utils/apiResponse";
import { BadRequestError, UnauthorizedError } from "../../errors/httpErrors";

// Session 1: success → standard envelope (sendSuccess); the 2FA services throw
// on failure, so we map "expired" → 401 and everything else → 400 and re-throw
// as a typed AppError for the central errorHandler to format.
const mapTwoFactorError = (error: any) => {
  const message = error?.message || "Two-factor request failed";
  return /expired/i.test(message) ? new UnauthorizedError(message) : new BadRequestError(message);
};

export const setup2FAController = async (req: Request, res: Response) => {
  const userId = (req as any).user?.user_id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  try {
    const result = await setup2FA(userId);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new BadRequestError(error?.message || "Failed to set up 2FA");
  }
};

export const enable2FAController = async (req: Request, res: Response) => {
  const userId = (req as any).user?.user_id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { token } = req.body;
  if (!token) throw new BadRequestError("token is required");

  try {
    const result = await enable2FA(userId, token);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new BadRequestError(error?.message || "Failed to enable 2FA");
  }
};

export const disable2FAController = async (req: Request, res: Response) => {
  const userId = (req as any).user?.user_id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { token } = req.body;
  if (!token) throw new BadRequestError("token is required");

  try {
    const result = await disable2FA(userId, token);
    sendSuccess(res, result);
  } catch (error: any) {
    throw new BadRequestError(error?.message || "Failed to disable 2FA");
  }
};

export const setupWithTokenController = async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  if (!tempToken) throw new BadRequestError("tempToken is required");

  try {
    const result = await setupWithTempToken(tempToken);
    sendSuccess(res, result);
  } catch (error: any) {
    throw mapTwoFactorError(error);
  }
};

export const verifyLogin2FAController = async (req: Request, res: Response) => {
  const { tempToken, mfaToken } = req.body;
  if (!tempToken || !mfaToken) {
    throw new BadRequestError("tempToken and mfaToken are required");
  }

  try {
    const result = await verifyLogin2FA(tempToken, mfaToken, req);
    sendSuccess(res, result);
  } catch (error: any) {
    throw mapTwoFactorError(error);
  }
};

export const verifyRecoveryCodeController = async (req: Request, res: Response) => {
  const { tempToken, recoveryCode } = req.body;
  if (!tempToken || !recoveryCode) {
    throw new BadRequestError("tempToken and recoveryCode are required");
  }

  try {
    const result = await verifyLoginWithRecoveryCode(tempToken, recoveryCode, req);
    sendSuccess(res, result);
  } catch (error: any) {
    throw mapTwoFactorError(error);
  }
};
