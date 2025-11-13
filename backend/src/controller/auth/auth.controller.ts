import { Request, Response } from "express";
import * as authService from "../../services/auth/auth.service";

export const signupController = async (req: Request, res: Response) => {
  try {
    const data = await authService.signup(req.body, req);
    res.status(201).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    res.status(400).json({ error: message });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const data = await authService.login(req.body, req); // req pass kar raha h
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
};

export const resendVerificationController = async (req: Request, res: Response) => {
  try {
    // req.user middleware se aayega (authentication ke baad)
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await authService.resendVerificationEmail(userId);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resend verification email";
    res.status(400).json({ error: message });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({ 
        error: true, 
        message: "Token is required" 
      });
    }

    const result = await authService.verifyEmail({ token });
    
    if (result.error) {
      return res.status(400).json(result);
    }
    
    res.status(200).json({ 
      success: true,
      message: "Email verified successfully", 
      user: result.user,
      token: result.token 
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    res.status(400).json({ error: true, message });
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


export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: "User not authenticated" 
      });
    }

    const result = await authService.deleteAccount(userId);
    res.status(200).json(result);
    
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete account";
    res.status(500).json({ 
      error: message 
    });
  }
};






