import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import prisma from '../lib/prisma';

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    let token: string | null =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    // ✅ Fallback sur cookie httpOnly
    if (!token && (req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token) as { user_id?: string } | null;
    if (!decoded?.user_id) {
      return res.status(401).json({ error: true, message: 'Invalid token payload' });
    }

    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        email: true,
        role: true,
        agency_id: true,
        is_email_verified: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: true, message: 'User not found' });
    }

    // Attacher l'user au req pour les contrôleurs
    (req as any).user = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
    };

    console.log('🔐 User authenticated:', user.user_id, user.email);
    return next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({ error: true, message: 'Invalid token' });
  }
};
