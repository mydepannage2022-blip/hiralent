import "express";
import { AuthenticatedUser, SessionInfo } from './session.types';


// ✅ AuthUser interface with all required properties
export interface AuthUser {
  user_id: string;
  role: string;
  agency_id?: string;
  session_id: string;
  is_email_verified?: boolean;
  company_id?: string;
  email?: string; // Adding email for candidate flow
  full_name?: string; // Adding full_name for candidate flow
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
