import "express";
interface AuthUser {
  user_id: string;
  role: "candidate" | "recruiter" | "admin" | "superadmin" | "agency" | string;
  agency_id?: string;
  is_email_verified?: boolean;
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
