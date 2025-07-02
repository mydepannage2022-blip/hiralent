import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

// ✅ This matches your global types in express.d.ts
interface UserPayload {
  user_id: string;
  role: "candidate" | "recruiter" | "admin" | "superadmin" | "agency";
  agency_id?: string;
  is_email_verified?: boolean;
}

// export const checkAuth = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ error: "Unauthorized: Token missing" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
//     req.user = decoded; // ✅ typed safely (thanks to express.d.ts)
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

export const checkAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized: Token missing" });
    return; // ✅ Explicitly return void
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return; // ✅ Explicitly return void
  }
};
