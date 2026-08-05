import { Request, Response, NextFunction } from "express";
import { requireEnv } from "../config/requireEnv";
import { secretsMatch } from "../config/secretCompare";

export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  if (!secretsMatch(token, requireEnv("BACKEND_INTERNAL_TOKEN"))) {
    return res.status(403).json({ message: "Invalid internal token" });
  }

  // NOTE: never log the Authorization header or the token itself — doing so writes the
  // shared internal secret into plaintext logs on every successful call.
  return next();
}
