import { Request, Response, NextFunction } from "express";

export const isEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.is_email_verified) {
    res.status(403).json({ error: "Please verify your email first" });
    return;
  }
  next();
  return;
};
