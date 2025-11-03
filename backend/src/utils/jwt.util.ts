// backend/src/utils/jwt.util.ts
import jwt, { SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms"; 

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing in environment variables");
}

export const generateToken = (
  payload: { user_id: string; role?: string; agency_id?: string },
  expiresIn: number | StringValue = "7d"
): string => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): { user_id: string; role?: string; agency_id?: string } => {
  return jwt.verify(token, JWT_SECRET) as { user_id: string; role?: string; agency_id?: string };
};