import "express";
import { AuthenticatedUser, SessionInfo } from './session.types';


// ✅ AuthUser interface with all required properties
export interface AuthUser {
  user_id: string;
  role: string;
  agency_id?: string;
  session_id: string;
  is_email_verified?: boolean;
  email?: string;
  full_name?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
    validatedBody?: any;
    sanitizedHTML?: string;
    file?: Express.Multer.File;

    files?: Express.Multer.File[];
  }
}

// ✅ Re-export for easy importing
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionInfo?: SessionInfo;
    }
  }
}

export {};
