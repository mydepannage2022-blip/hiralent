import express from "express";
import {
  signupController,
  loginController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
} from "../controller/auth.controller";

const router = express.Router();

router.post("/signup", signupController);
router.post("/login", loginController);
router.get("/verify-email", verifyEmailController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

export default router;
