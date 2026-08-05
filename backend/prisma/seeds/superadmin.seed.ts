// prisma/seeds/superadmin.seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEFAULT_EMAIL = 'admin@hiralent.com';
const DEV_DEFAULT_PASSWORD = 'hiralent1234@';

/**
 * Seed a single superadmin user — idempotent and safe.
 *
 * Credentials come from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.
 *
 * FAIL-CLOSED on the password: the well-known dev default is used ONLY when NODE_ENV is
 * explicitly `development` or `test`. For any other value (unset, `staging`, `production`, …)
 * a SUPERADMIN_PASSWORD is REQUIRED; if it's missing we skip creation with a loud warning, so
 * a misconfigured deploy (e.g. NODE_ENV unset) can never silently ship a guessable admin.
 *
 * PRIVESC-SAFE: we create only when the email is absent. If an account already owns that email
 * we NEVER change its role — otherwise a user who registered SUPERADMIN_EMAIL as a candidate
 * would be promoted to superadmin (keeping their own password) on the next seed run. An
 * existing superadmin is left untouched (so re-seeding never clobbers a rotated credential),
 * which also makes the seed idempotent. Uses bcryptjs (repo-wide hashing).
 */
export async function seedSuperAdmin(prisma: PrismaClient): Promise<void> {
  const env = process.env.NODE_ENV;
  const devLike = env === 'development' || env === 'test';
  const email = process.env.SUPERADMIN_EMAIL || DEFAULT_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD || (devLike ? DEV_DEFAULT_PASSWORD : '');

  if (!password) {
    console.warn(
      `⚠️  [superadmin] no SUPERADMIN_PASSWORD and NODE_ENV='${env ?? '(unset)'}' is not ` +
      `development/test — skipping superadmin seed (never ships a known default password). ` +
      `Set SUPERADMIN_PASSWORD, or NODE_ENV=development for a local default.`
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'superadmin') {
      console.warn(
        `⚠️  [superadmin] a non-superadmin account already owns ${email} (role='${existing.role}') — ` +
        `NOT promoting it (privilege-escalation safety). Resolve manually or use a different SUPERADMIN_EMAIL.`
      );
    } else {
      console.log(`✅ [superadmin] already present: ${email}`);
    }
    return;
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const admin = await prisma.user.create({
    data: {
      email,
      password_hash,
      full_name: 'Super Admin',
      role: 'superadmin',
      is_email_verified: true,
    },
  });

  console.log(`✅ [superadmin] created: ${admin.email} (role=${admin.role})`);
}
