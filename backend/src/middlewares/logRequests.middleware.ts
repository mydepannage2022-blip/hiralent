import { Request, Response, NextFunction } from "express";

export const logRequests = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user?.user_id || "anonymous";
  console.log(`[${req.method}] ${req.originalUrl} by ${user}`);
  next();
};
