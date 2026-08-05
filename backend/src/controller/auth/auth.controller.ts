import { Request, Response } from "express";
import * as authService from "../../services/auth/auth.service";
import { sendSuccess } from "../../utils/apiResponse";
import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from "../../errors/httpErrors";

// Session 1: every success response uses the standard envelope { success:true, data }
// (sendSuccess). Errors are thrown as typed AppErrors and formatted centrally by
// errorHandler — no more hand-rolled res.status().json({ error }). Async throws are
// forwarded to errorHandler automatically by Express 5.

export const getMeController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.user_id;
  if (!userId) throw new UnauthorizedError("Not authenticated");

  const user = await (await import("../../lib/prisma")).default.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      email: true,
      full_name: true,
      role: true,
      is_email_verified: true,
      phone_number: true,
      agency_id: true,
      mfa_enabled: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");

  sendSuccess(res, { user });
};

export const signupController = async (req: Request, res: Response) => {
  // signup throws ConflictError on a duplicate email (→ 409) and returns
  // { user, token, refreshToken, emailDelivered } on success.
  const data = await authService.signup(req.body, req);
  sendSuccess(res, data, 201);
};

export const loginController = async (req: Request, res: Response) => {
  const data = await authService.login(req.body, req);
  if ((data as any)?.error) throw new UnauthorizedError((data as any).message || "Login failed");
  sendSuccess(res, data, 200);
};

export const resendVerificationController = async (req: Request, res: Response) => {
  const userId = req.user?.user_id;
  if (!userId) throw new UnauthorizedError("User not authenticated");

  const result = await authService.resendVerificationEmail(userId);
  if ((result as any)?.error) throw new BadRequestError((result as any).message || "Failed to resend verification email");
  sendSuccess(res, { message: (result as any).message, emailDelivered: (result as any).emailDelivered });
};

export const verifyEmailController = async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) throw new BadRequestError("Token is required");

  const result = await authService.verifyEmail({ token });
  if ((result as any).error) throw new BadRequestError((result as any).message || "Verification failed");

  sendSuccess(res, { message: "Email verified successfully", user: (result as any).user });
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body);
  sendSuccess(res, { message: "Reset link sent" });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  sendSuccess(res, { message: "Password updated" });
};

export const deleteAccountController = async (req: Request, res: Response) => {
  const userId = req.user?.user_id;
  if (!userId) throw new UnauthorizedError("User not authenticated");

  const result = await authService.deleteAccount(userId);
  // deleteAccount may signal failure via a returned { error:true } object rather
  // than a throw — don't wrap that as a 200 success envelope.
  if ((result as any)?.error) throw new BadRequestError((result as any).message || "Failed to delete account");
  sendSuccess(res, result);
};

export const changePasswordController = async (req: Request, res: Response) => {
  const userId = req.user?.user_id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) throw new UnauthorizedError("Unauthorized");
  if (!currentPassword || !newPassword) {
    throw new BadRequestError("Current password and new password are required");
  }
  if (newPassword.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters");
  }

  // changePassword THROWS plain Errors ("Current password is incorrect", "User not
  // found") — without this, those would collapse to a generic 500 (message lost)
  // instead of the actionable 400 the client used to get. Typed AppErrors pass through.
  try {
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    if ((result as any)?.error) throw new BadRequestError((result as any).message || "Failed to change password");
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new BadRequestError(err instanceof Error ? err.message : "Failed to change password");
  }
};
