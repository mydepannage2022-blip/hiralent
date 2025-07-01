import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const signupController = async (req: Request, res: Response) => {
  try {
    const data = await authService.signup(req.body);
    res.status(201).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    res.status(400).json({ error: message });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const data = await authService.login(req.body);
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const result = await authService.verifyEmail({ token: req.query.token as string });
    res.status(200).json({ message: "Email verified", user: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    res.status(400).json({ error: message });
  }
};
export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    await authService.forgotPassword(req.body);
     res.status(200).json({ message: "Reset link sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reset link";
    res.status(400).json({ error: message });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    await authService.resetPassword(req.body);
    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed";
    res.status(400).json({ error: message });
  }
};
