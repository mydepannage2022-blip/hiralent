// backend/src/controller/auth/refresh.controller.ts
//
// Wave 1 / Phase 1.2 — rotating refresh + real logout revocation.

import { Request, Response } from "express";
import { refreshTokens, logoutSession } from "../../services/auth/tokenIssue.service";
import { AuthenticatedRequest } from "../../middlewares/checkAuth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import { BadRequestError, UnauthorizedError } from "../../errors/httpErrors";

/**
 * POST /auth/refresh   (public — the access token may already be expired)
 * Body: { refreshToken }
 * Rotates the refresh token and returns a fresh access + refresh pair.
 */
export const refreshController = async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new BadRequestError("refreshToken is required");
  }

  const result = await refreshTokens(refreshToken);
  if (!result) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  sendSuccess(res, { token: result.accessToken, refreshToken: result.refreshToken }, 200);
};

/**
 * POST /auth/logout   (checkAuth-protected)
 * Blacklists the presented access token and deactivates its session so the token
 * is rejected immediately on subsequent requests.
 */
export const logoutController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.user_id;
  const sessionId = req.user?.session_id;
  if (!userId || !sessionId) {
    throw new UnauthorizedError("Not authenticated");
  }

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";

  await logoutSession(accessToken, sessionId, userId);

  sendSuccess(res, { message: "Logged out" }, 200);
};
