#!/usr/bin/env ts-node
import 'dotenv/config';
import { sendEmail } from '../utils/email.util';

// Simple dev-only SMTP tester. Usage:
//   npx ts-node src/scripts/testEmail.ts recipient@example.com
// Or set TEST_EMAIL_TO in backend/.env
async function run() {
  const to = process.env.TEST_EMAIL_TO || process.argv[2] || process.env.SMTP_USER || 'dev@example.com';
  console.log('[testEmail] SMTP_HOST=', process.env.SMTP_HOST);
  console.log('[testEmail] SMTP_PORT=', process.env.SMTP_PORT);
  console.log('[testEmail] SMTP_USER=', process.env.SMTP_USER);

  const subject = `Hiralent dev SMTP test - ${new Date().toISOString()}`;
  const html = `<p>This is a test email from the Hiralent dev environment to ${to}.</p><p>Time: ${new Date().toISOString()}</p>`;

  try {
    await sendEmail({ to, subject, html });
    console.log('[testEmail] sendEmail completed');
    process.exit(0);
  } catch (e) {
    console.error('[testEmail] sendEmail failed', e);
    process.exit(1);
  }
}

run();
