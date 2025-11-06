import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { sendEmail } from '../utils/email.util';
import { getWelcomeEmailTemplate, getLegacyCheckEmailTemplate } from '../services/emailTemplates.service';
import { generateToken } from '../utils/jwt.util';

/**
 * Lightweight notifier script that scans recently-created company profiles and
 * sends welcome & legacy-check emails if not already sent. This avoids editing
 * merged controllers: run this as a small background task during development.
 */

const CACHE_FILE = path.join(__dirname, '../../.company_email_cache.json');

function loadCache(): Record<string, boolean> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn('Could not read email cache, starting fresh', (e as Error).message);
    return {};
  }
}

function saveCache(cache: Record<string, boolean>) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to write email cache', (e as Error).message);
  }
}

async function main() {
  console.log('[notifier] Starting company welcome/legacy notifier');
  const cache = loadCache();

  // Find company profiles created in the last 48 hours (tunable)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const profiles = await prisma.companyProfile.findMany({
    where: { created_at: { gte: since } },
    include: { user: true }
  });

  if (!profiles || profiles.length === 0) {
    console.log('[notifier] No recent company profiles found');
    return;
  }

  for (const profile of profiles) {
    try {
      const companyId = profile.company_id;
      if (cache[companyId]) {
        // already processed
        continue;
      }

      const user = profile.user;
      if (!user || !user.email) {
        console.warn(`[notifier] Profile ${companyId} has no linked user/email`);
        cache[companyId] = true; // avoid retrying until manual review
        continue;
      }

      const verificationToken = generateToken({ userId: user.user_id }, '7d');
      const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

      // Welcome email
      const welcomeHtml = getWelcomeEmailTemplate(verificationLink, profile.display_name || profile.company_name || 'Company');
      await sendEmail({ to: user.email, subject: 'Welcome to Hiralent — verify your email', html: welcomeHtml });

      // Legacy check / verification request email
  const legacyLink = `${process.env.FRONTEND_URL}${process.env.FRONTEND_UPLOAD_PATH || '/company/upload'}?companyId=${companyId}`;
      const legacyHtml = getLegacyCheckEmailTemplate(legacyLink, profile.display_name || profile.company_name || 'Company');
      await sendEmail({ to: user.email, subject: 'Please upload company documents for verification', html: legacyHtml });

      console.log(`[notifier] Sent welcome+legacy emails to ${user.email} for company ${companyId}`);
      cache[companyId] = true;
      // persistent little pause
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      console.error('[notifier] Failed to process profile', profile.company_id, e.message || e);
    }
  }

  saveCache(cache);
  console.log('[notifier] Done');
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[notifier] Fatal error', (e as Error).message);
    process.exit(1);
  });
}

// Export main for programmatic use (dev routes / tests)
export { main };
