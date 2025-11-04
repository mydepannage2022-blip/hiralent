import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

// ✅ This matches your global types in express.d.ts
interface UserPayload {
  user_id: string;
  role: "candidate" | "company_admin" | "super_admin" | "agency_admin" | "agency" | "company";
  agency_id?: string;
  company_id: string;
  is_email_verified?: boolean;
}

export const checkAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log("=== AUTH DEBUG ===");
  console.log("Authorization Header:", req.headers.authorization);
  console.log("Path:", req.path);
  console.log("Method:", req.method);
  
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("❌ No auth header found");
    res.status(401).json({ 
      ok: false, 
      error: "Unauthorized: Token missing" 
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("❌ Auth header doesn't start with 'Bearer '");
    res.status(401).json({ 
      ok: false, 
      error: "Invalid authentication token" 
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  
  console.log("Token extracted:", token?.substring(0, 20) + "...");
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

  if (!token) {
    console.log("❌ Token is empty after split");
    res.status(401).json({ 
      ok: false, 
      error: "Invalid authentication token" 
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    
    console.log("✅ Token decoded successfully");
    console.log("User ID:", decoded.user_id);
    console.log("Role:", decoded.role);
    
    req.user = decoded;
    next();
  } catch (error: any) {
    console.log("❌ JWT verification failed:", error.message);
    console.log("Error name:", error.name);
    
    if (error.name === 'TokenExpiredError') {
      console.log("⏰ Token has expired");
      res.status(401).json({ 
        ok: false, 
        error: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    } else if (error.name === 'JsonWebTokenError') {
      console.log("⚠ Invalid token format");
      res.status(401).json({ 
        ok: false, 
        error: "Invalid token. Please login again.",
        code: "INVALID_TOKEN"
      });
    } else {
      console.log("⚠ Unknown token error");
      res.status(401).json({ 
        ok: false, 
        error: "Invalid authentication token",
        code: "AUTH_ERROR"
      });
    }
    return;
  }
};