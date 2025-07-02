import { Request, Response, NextFunction } from "express";

export const ownershipGuard = (extractOwnerId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ownerId = extractOwnerId(req);
    const currentUserId = req.user?.user_id;

    if (!currentUserId || currentUserId !== ownerId) {
      res.status(403).json({ error: "Forbidden: Not your resource" });
      return; // ✅ Explicit return to satisfy void type
    }

    next();
  };
};
