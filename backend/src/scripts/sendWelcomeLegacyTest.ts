import dotenv from 'dotenv';
import { sendEmail } from '../utils/email.util';
import { generateToken } from '../utils/jwt.util';

dotenv.config();

async function main() {
  const to = process.argv[2] || 'youssrakalamidrissi@gmail.com';
  const companyName = process.argv[3] || 'New Company';

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || 'http://localhost:3000';
  let verificationLink = `${frontendUrl}/auth/verify-email?token=dev-token`;
  try {
    // Try to generate a short-lived token if possible
    const token = generateToken ? generateToken({ user_id: 'dev-user' }, '15m') : null;
    if (token) verificationLink = `${frontendUrl}/auth/verify-email?token=${token}`;
  } catch (e) {
    // ignore — use fallback link
  }

  const uploadPath = process.env.FRONTEND_UPLOAD_PATH || '/company/upload';
  const uploadLink = `${frontendUrl}${uploadPath}`;

  const welcomeHtml = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 680px; margin: 0 auto; background:#f8fafc; padding:28px;">
      <div style="background:white; border-radius:12px; padding:28px; box-shadow: 0 6px 18px rgba(15,23,42,0.06);">
        <div style="text-align:center; margin-bottom:18px;">
          <div style="width:64px; height:64px; margin:0 auto; border-radius:12px; background:linear-gradient(135deg,#0ea5a4,#6366f1); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:22px;">H</div>
        </div>
        <h2 style="color:#0f172a; font-size:20px; text-align:center; margin:0 0 8px;">Welcome to Hiralent</h2>
        <p style="color:#334155; text-align:center; margin:0 0 20px;">Hi ${companyName || 'there'}, thanks for joining Hiralent. Please verify your email to access your dashboard.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${verificationLink}" style="background:#6366f1; color:white; padding:12px 22px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">Verify Email</a>
        </div>
        <p style="color:#94a3b8; font-size:13px; text-align:center; margin-top:18px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:14px;">© ${new Date().getFullYear()} Hiralent</p>
    </div>
  `;

  const legacyHtml = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 680px; margin: 0 auto; background:#f8fafc; padding:28px;">
      <div style="background:white; border-radius:12px; padding:28px; box-shadow: 0 6px 18px rgba(15,23,42,0.06);">
        <div style="text-align:center; margin-bottom:14px;">
          <div style="width:64px; height:64px; margin:0 auto; border-radius:12px; background:linear-gradient(135deg,#f59e0b,#ef4444); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:22px;">📁</div>
        </div>
        <h2 style="color:#0f172a; font-size:20px; text-align:center; margin:0 0 8px;">Quick action required</h2>
        <p style="color:#334155; text-align:center; margin:0 0 18px;">Hi ${companyName || 'there'}, please upload your company documents so we can verify your account and unlock features.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${uploadLink}" style="background:#0ea5a4; color:white; padding:12px 22px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">Upload documents</a>
        </div>
        <p style="color:#94a3b8; font-size:13px; text-align:center; margin-top:18px;">If you already uploaded, you can ignore this message.</p>
      </div>
      <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:14px;">© ${new Date().getFullYear()} Hiralent</p>
    </div>
  `;

  try {
    console.log(`[sendWelcomeLegacyTest] Sending welcome email to ${to}`);
    const res1 = await sendEmail({ to, subject: 'Welcome to Hiralent - Verify Your Email', html: welcomeHtml });
    console.log('[sendWelcomeLegacyTest] Welcome email result:', res1);
  } catch (e: any) {
    console.error('[sendWelcomeLegacyTest] Failed to send welcome email:', e?.message || e);
  }

  try {
    console.log(`[sendWelcomeLegacyTest] Sending legacy-check email to ${to}`);
    const res2 = await sendEmail({ to, subject: 'Verify Your Company Legacy - Hiralent', html: legacyHtml });
    console.log('[sendWelcomeLegacyTest] Legacy-check email result:', res2);
  } catch (e: any) {
    console.error('[sendWelcomeLegacyTest] Failed to send legacy-check email:', e?.message || e);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('sendWelcomeLegacyTest error', e);
  process.exit(1);
});
