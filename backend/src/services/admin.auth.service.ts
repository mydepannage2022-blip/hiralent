import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-this';
const ADMIN_SESSION_DURATION = process.env.ADMIN_SESSION_DURATION || '8h';

export async function adminLogin(email: string, password: string) {
  const admin = await prisma.user.findFirst({
    where: { 
      email,
      role: 'superadmin'
    }
  });
  
  if (!admin) {
    throw new Error('Invalid admin credentials');
  }
  
  const isValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isValid) {
    throw new Error('Invalid admin credentials');
  }
  
  const tempToken = jwt.sign(
    { 
      user_id: admin.user_id, 
      step: 'mfa_required',
      email: admin.email
    },
    ADMIN_JWT_SECRET,
    { expiresIn: '5m' } as SignOptions
  );
  
  return {
    success: true,
    tempToken,
    requiresMFA: admin.mfa_enabled ?? false,
    mfaSetup: !admin.mfa_enabled
  };
}

export async function setupMFA(tempToken: string) {
  let decoded: any;
  
  try {
    decoded = jwt.verify(tempToken, ADMIN_JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
  
  if (decoded.step !== 'mfa_required') {
    throw new Error('Invalid token for this operation');
  }
  
  const admin = await prisma.user.findUnique({
    where: { user_id: decoded.user_id }
  });
  
  if (!admin || admin.role !== 'superadmin') {
    throw new Error('Admin not found');
  }
  
  const secret = speakeasy.generateSecret({
    name: `Hiralent Admin (${admin.email})`,
    length: 32,
    issuer: 'Hiralent' 
  });
  
  await prisma.user.update({
    where: { user_id: admin.user_id },
    data: { 
      mfa_secret: secret.base32,
      mfa_enabled: true 
    }
  });
  
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  return {
    success: true,
    qrCode: qrCodeUrl,
    secret: secret.base32,
    manualEntryKey: secret.base32
  };
}
export async function verifyMFA(tempToken: string, mfaToken: string) {
  let decoded: any;
  
  try {
    decoded = jwt.verify(tempToken, ADMIN_JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
  
  const admin = await prisma.user.findUnique({
    where: { user_id: decoded.user_id }
  });
  
  if (!admin || admin.role !== 'superadmin' || !admin.mfa_secret) {
    throw new Error('Invalid admin or MFA not configured');
  }
  
  const verified = speakeasy.totp.verify({
    secret: admin.mfa_secret,
    encoding: 'base32',
    token: mfaToken,
    window: 2
  });
  
  if (!verified) {
    throw new Error('Invalid MFA code');
  }
  
  await prisma.user.update({
    where: { user_id: admin.user_id },
    data: { last_login_at: new Date() }
  });
  
  const sessionToken = jwt.sign(
    { 
      user_id: admin.user_id,
      email: admin.email,
      role: 'superadmin',
      authenticated: true,
      full_name: admin.full_name
    },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_SESSION_DURATION } as SignOptions
  );
  
  return {
    success: true,
    sessionToken,
    admin: {
      user_id: admin.user_id,
      email: admin.email,
      full_name: admin.full_name
    }
  };
}
