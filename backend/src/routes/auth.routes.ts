import { Router } from 'express';
import {
  signupController,
  loginController,
  resendVerificationController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
  logoutController,
} from '../controller/auth.controller';

const router = Router();

router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/logout', logoutController);

router.post('/resend-verification', resendVerificationController);
router.get('/verify-email', verifyEmailController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);

export default router;
