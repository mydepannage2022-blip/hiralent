import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define AuthUser type (customize fields as needed)
type AuthUser = {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  [key: string]: any;
};

// The Express Request type extension for "user" is defined in src/types/express.d.ts
// Remove duplicate declaration here to avoid type conflicts.

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null) {
      req.user = decoded as AuthUser;
    } else {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    next();
  } catch (err: any) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
