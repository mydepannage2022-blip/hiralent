import { Request, Response, NextFunction } from "express";

export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  if (token !== process.env.BACKEND_INTERNAL_TOKEN) {
    return res.status(403).json({ message: "Invalid internal token" });
  }

  return next();
}
