// src/types/express.ts
import { Request } from 'express';

export interface AuthUser {
  user_id: string;  // Change from 'id' to 'user_id'
  email: string;
  role: string;
  agency_id?: string;
  name?: string;
  // Add other properties as needed
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}