import { Request, Response, NextFunction } from "express";

export const checkRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden: Role not allowed" });
      return; 
    }

    next(); 
  };
};
