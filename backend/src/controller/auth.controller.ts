import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const signupController = async (req: Request, res: Response) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    res.status(400).json({ error: message });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    res.status(401).json({ error: message });
  }
};

export const oauthController = async (req: Request, res: Response) => {
  try {
    const result = await authService.handleOAuth(req.body);
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    res.status(401).json({ error: message });
  }
};
