import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyFirebaseToken } from "../utils/firebase";
import { generateToken } from "../utils/jwt.util";

// Define interface for signup input
interface SignupInput {
  email: string;
  password: string;
  full_name: string;
  role: string;
  agency_id?: string;
}

// Define interface for login input
interface LoginInput {
  email: string;
  password: string;
}

// Define interface for OAuth input
interface OAuthInput {
  firebase_token: string;
}

export const signup = async ({ email, password, full_name, role, agency_id }: SignupInput) => {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Email already exists");

  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password_hash,
      full_name,
      role,
      agency_id,
      is_email_verified: false,
    },
  });

  const token = generateToken({ user_id: user.user_id, role: user.role, agency_id: user.agency_id });
  return { user, token };
};

export const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_email_verified) throw new Error("Invalid email or unverified account");

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = generateToken({ user_id: user.user_id, role: user.role, agency_id: user.agency_id });
  return { user, token };
};

export const handleOAuth = async ({ firebase_token }: OAuthInput) => {
  const decoded = await verifyFirebaseToken(firebase_token); // decode using Firebase Admin SDK

if (!decoded.email) {
  throw new Error("OAuth token does not contain a valid email");
}

const user = await prisma.user.upsert({
  where: { email: decoded.email },
  update: {},
  create: {
    email: decoded.email,
    full_name: decoded.name ?? "OAuth User",
    is_email_verified: true,
    password_hash: "oauth",
    role: "candidate",
  },
});
  const token = generateToken({ user_id: user.user_id, role: user.role, agency_id: user.agency_id });
  return { user, token };
};
