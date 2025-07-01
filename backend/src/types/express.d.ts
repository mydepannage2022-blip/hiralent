import "express";

// Shared user payload (from JWT)
interface AuthUser {
  user_id: string;
  role: "candidate" | "recruiter" | "admin" | "superadmin" | "agency" | string;
  agency_id?: string;
  is_email_verified?: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser; // available after checkAuth middleware

    // If you're injecting parsed data in middlewares, you can extend:
    validatedBody?: any; // or a generic type if you use Zod/Joi validation
  }
}
