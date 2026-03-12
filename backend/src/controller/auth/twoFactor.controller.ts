import { Request, Response } from "express";
import {
  setup2FA,
  setupWithTempToken,
  enable2FA,
  disable2FA,
  verifyLogin2FA,
  verifyLoginWithRecoveryCode,
} from "../../services/auth/twoFactor.service";

export const setup2FAController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) return res.status(401).json({ error: true, message: "Unauthorized" });

    const result = await setup2FA(userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
};

export const enable2FAController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) return res.status(401).json({ error: true, message: "Unauthorized" });

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: true, message: "token is required" });

    const result = await enable2FA(userId, token);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
};

export const disable2FAController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) return res.status(401).json({ error: true, message: "Unauthorized" });

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: true, message: "token is required" });

    const result = await disable2FA(userId, token);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
};

export const setupWithTokenController = async (req: Request, res: Response) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: true, message: "tempToken is required" });

    const result = await setupWithTempToken(tempToken);
    return res.json(result);
  } catch (error: any) {
    const status = error.message.includes("expired") ? 401 : 400;
    return res.status(status).json({ error: true, message: error.message });
  }
};

export const verifyLogin2FAController = async (req: Request, res: Response) => {
  try {
    const { tempToken, mfaToken } = req.body;
    if (!tempToken || !mfaToken) {
      return res.status(400).json({ error: true, message: "tempToken and mfaToken are required" });
    }

    const result = await verifyLogin2FA(tempToken, mfaToken, req);
    return res.json(result);
  } catch (error: any) {
    const status = error.message.includes("expired") ? 401 : 400;
    return res.status(status).json({ error: true, message: error.message });
  }
};

export const verifyRecoveryCodeController = async (req: Request, res: Response) => {
  try {
    const { tempToken, recoveryCode } = req.body;
    if (!tempToken || !recoveryCode) {
      return res.status(400).json({ error: true, message: "tempToken and recoveryCode are required" });
    }

    const result = await verifyLoginWithRecoveryCode(tempToken, recoveryCode, req);
    return res.json(result);
  } catch (error: any) {
    const status = error.message.includes("expired") ? 401 : 400;
    return res.status(status).json({ error: true, message: error.message });
  }
};
