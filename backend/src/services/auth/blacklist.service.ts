// src/services/auth/blacklist.service.ts
import prisma  from '../../lib/prisma';
import crypto from 'crypto';
import { getTokenExpiration } from '../../utils/jwt.util';

export const addToBlacklist = async (tokenHash: string, sessionId?: string, userId?: string) => {
  await prisma.jwtBlacklist.create({
    data: {
      token_hash: tokenHash,
      session_id: sessionId,
      user_id: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const blacklisted = await prisma.jwtBlacklist.findFirst({
    where: { 
      token_hash: tokenHash,
      expires_at: { gt: new Date() }
    }
  });
  
  return !!blacklisted;
};
