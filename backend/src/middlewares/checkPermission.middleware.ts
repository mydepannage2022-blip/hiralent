import { Request, Response, NextFunction } from "express";
import prisma  from "../lib/prisma";

export const checkPermission = (
  module: string,
  requiredLevel: "read" | "write" | "manage"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.user?.role;
      if (!role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const permission = await prisma.rolePermission.findFirst({
        where: { role_name: role, module },
      });

      const levels = ["none", "read", "write", "manage"];
      const hasAccess =
        permission &&
        levels.indexOf(permission.access_level) >= levels.indexOf(requiredLevel);

      if (!hasAccess) {
        return res
          .status(403)
          .json({ error: "Forbidden: Permission denied" });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        error: "Permission check failed",
        detail: err.message,
      });
    }
  };
};
