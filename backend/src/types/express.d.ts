import "express";

// ✅ AuthUser interface with all required properties
export interface AuthUser {
  user_id: string;
  role: "candidate" | "recruiter" | "admin" | "superadmin" | "agency" | string;
  agency_id?: string;
  is_email_verified?: boolean;
  email?: string; // Adding email for candidate flow
  full_name?: string; // Adding full_name for candidate flow
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    validatedBody?: any;
    sanitizedHTML?: string;

    /** ✅ multer's file type */
    file?: Express.Multer.File;

    /** ✅ optional: if you ever allow multiple file uploads */
    files?: Express.Multer.File[];
  }
}

// ✅ Re-export for easy importing
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
