import { Request, Response, NextFunction } from "express";

/**
 * Usage: Compare `req.user.user_id` with `req.params.id` or a custom logic
 */
export const ownershipGuard = (extractOwnerId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUserId = req.user?.user_id;
    const resourceOwnerId = extractOwnerId(req);

    if (currentUserId !== resourceOwnerId) {
      return res.status(403).json({ error: "Access denied: Not your resource" });
    }
    next();
  };
};
