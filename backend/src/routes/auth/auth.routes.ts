import express from "express";
import {
  signupController,
  loginController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
  resendVerificationController,
  deleteAccountController,
  changePasswordController,
  getMeController,
} from "../../controller/auth/auth.controller";
import {
  googleAuthController,
  googleCallbackController,
  googleCompleteController,
} from "../../controller/auth/googleAuth.controller";
import {
  setup2FAController,
  setupWithTokenController,
  enable2FAController,
  disable2FAController,
  verifyLogin2FAController,
  verifyRecoveryCodeController,
} from "../../controller/auth/twoFactor.controller";
import { refreshController, logoutController } from "../../controller/auth/refresh.controller";
import { validateBody } from "../../middlewares/validateBody.middleware";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  DeleteAccountSchema
} from "../../validation/auth.schema"; // Assuming Zod/Joi schema files

const router = express.Router();

router.get("/me", checkAuth, getMeController);
router.post("/signup", validateBody(SignupSchema), signupController);
router.post("/login", validateBody(LoginSchema), loginController);
router.post("/refresh", refreshController);
router.post("/logout", checkAuth, logoutController);
router.post("/resend-verification", checkAuth, resendVerificationController);
router.get("/verify-email", verifyEmailController);
router.post("/forgot-password", validateBody(ForgotPasswordSchema), forgotPasswordController);
router.post("/reset-password", validateBody(ResetPasswordSchema), resetPasswordController);

router.delete("/delete-account", checkAuth, validateBody(DeleteAccountSchema), deleteAccountController);
router.put("/change-password", checkAuth, changePasswordController);

// Google OAuth routes
router.get("/google", googleAuthController);
router.get("/google/callback", googleCallbackController);
router.post("/google/complete", checkAuth, googleCompleteController);

// 2FA routes
router.post("/2fa/setup", checkAuth, setup2FAController);
router.post("/2fa/setup-with-token", setupWithTokenController); // public — used during forced first-time setup at login
router.post("/2fa/enable", checkAuth, enable2FAController);
router.post("/2fa/disable", checkAuth, disable2FAController);
router.post("/2fa/verify-login", verifyLogin2FAController);
router.post("/2fa/verify-recovery", verifyRecoveryCodeController);

export default router;
