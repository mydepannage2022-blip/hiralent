import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Optional auth middleware.
 * Tries to verify the Bearer JWT from the Authorization header.
 * If valid → attaches decoded payload to req.user.
 * If missing or invalid → continues without setting req.user (guest mode).
 * Never rejects the request.
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && typeof decoded === 'object') {
        (req as any).user = decoded;
      }
    }
  } catch {
    // Invalid / expired token — treat request as guest, do not reject
  }

  next();
};
