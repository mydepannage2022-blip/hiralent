import { Request, Response, NextFunction } from "express";

export function requireScrapingAccess(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-scraping-token"); // MUST match Postman header

  if (!token) {
    return res.status(401).json({ error: true, message: "Access token required" });
  }

  if (token !== process.env.SCRAPING_SECRET) {
    return res.status(403).json({ error: true, message: "Invalid scraping token" });
  }

  return next();
}
