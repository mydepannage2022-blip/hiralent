import jwt, { SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms"; 

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing in environment variables");
}

export const generateToken = (
  payload: string | object,
  expiresIn: number | StringValue = "7d" 
): string => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};
