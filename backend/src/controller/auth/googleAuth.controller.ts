import { Request, Response } from "express";
import {
  getGoogleAuthURL,
  handleGoogleCallback,
  completeGoogleOnboarding,
} from "../../services/auth/googleAuth.service";

/** GET /api/v1/auth/google?role=candidate  →  redirect to Google consent */
export const googleAuthController = (req: Request, res: Response): void => {
  const role = (req.query.role as string) || "candidate";
  const url = getGoogleAuthURL(role);
  res.redirect(url);
};

/** GET /api/v1/auth/google/callback  →  exchange code, create session, redirect to frontend */
export const googleCallbackController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const code = req.query.code as string;
    const state = (req.query.state as string) || "";

    if (!code) {
      res.redirect(`${frontendUrl}/auth/login?error=oauth_cancelled`);
      return;
    }

    const { token, role, isNew } = await handleGoogleCallback(code, state, req);

    const dest = isNew
      ? `${frontendUrl}/auth/onboarding?token=${encodeURIComponent(token)}`
      : `${frontendUrl}/auth/google/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;

    res.redirect(dest);
  } catch (error: any) {
    console.error("[Google OAuth] callback error:", error?.message ?? error);
    res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }
};

/**
 * POST /api/v1/auth/google/complete
 * Called from the onboarding page once the user has chosen their role.
 * Requires: Bearer token (the pending_google token from the callback).
 * Body: { role: "candidate" | "company_admin", fullName?: string }
 */
export const googleCompleteController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role, fullName } = req.body as {
      role: "candidate" | "company_admin";
      fullName?: string;
    };

    if (!["candidate", "company_admin"].includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }

    const result = await completeGoogleOnboarding(
      req.user!.user_id,
      role,
      fullName
    );

    res.json({ success: true, token: result.token, role: result.role });
  } catch (error: any) {
    console.error("[Google OAuth] complete error:", error?.message ?? error);
    res.status(500).json({ success: false, message: "Failed to complete setup" });
  }
};
