import express from "express";
import {
  signupController,
  loginController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
  resendVerificationController,
  deleteAccountController
} from "../../controller/auth/auth.controller";
import { validateBody } from "../../middlewares/validateBody.middleware";
import { limiter } from "../../middlewares/rateLimiter.middleware";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  DeleteAccountSchema
} from "../../validation/auth.schema"; // Assuming Zod/Joi schema files

const router = express.Router();

router.post("/signup", validateBody(SignupSchema), signupController);
router.post("/login", validateBody(LoginSchema), loginController);
router.post("/resend-verification", checkAuth, resendVerificationController);
router.get("/verify-email", verifyEmailController);
router.post("/forgot-password", limiter, validateBody(ForgotPasswordSchema), forgotPasswordController);
router.post("/reset-password", validateBody(ResetPasswordSchema), resetPasswordController);

router.delete("/delete-account", checkAuth, validateBody(DeleteAccountSchema), deleteAccountController);
export default router;
