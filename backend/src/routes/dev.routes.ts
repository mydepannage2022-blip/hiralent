import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { PrismaClient } from '@prisma/client';
import { emitSubmissionEvent } from '../lib/submissionEmitter';
import { main as runCompanyNotifier } from '../scripts/companyEmailNotifier';
import * as authService from '../services/auth/auth.service';
import * as companyService from '../services/company.service';

const prisma = new PrismaClient();

const router = express.Router();

// Dev-only token mint endpoint.
// Guarded by NODE_ENV !== 'production' and ENABLE_DEV_MINT === '1'.
router.get('/mint-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const user_id = String(req.query.user_id || 'dev-user');
  const role = String(req.query.role || 'candidate');
  const agency_id = req.query.agency_id ? String(req.query.agency_id) : undefined;

  // Generate a long-lived dev token (30 days) to ease local testing
  const token = generateToken({ user_id, role, agency_id }, '30d');

  res.json({ token });
});

// Dev-only helper: ensure a user exists (upsert). Useful because CodeSubmission has a foreign key to User.
router.post('/ensure-user', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const user_id = String(req.body.user_id || req.query.user_id || 'dev-user');
  const email = String(req.body.email || req.query.email || `${user_id}@example.com`);
  const full_name = String(req.body.full_name || req.query.full_name || 'Dev User');

  try {
    // create a dev-friendly hashed password so login works locally
    const devPassword = 'devpass';
    const hashed = await bcrypt.hash(devPassword, 10);

    const user = await prisma.user.upsert({
      where: { user_id },
      update: {
        email,
        full_name,
      },
      create: {
        user_id,
        email,
        password_hash: hashed,
        full_name,
        role: 'candidate',
        is_email_verified: true,
      },
    });

  // return the dev password to make it easy to log in via /dev/login-test
  return res.json({ user, devPassword });
  } catch (err) {
    console.error('ensure-user error:', err);
    return res.status(500).json({ error: 'Failed to ensure user' });
  }
});

// Dev-only: seed a minimal assessment + question for local testing
router.post('/seed-assessment', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const assessmentId = String(req.body.assessmentId || req.query.assessmentId || 'local-test');
  const questionId = String(req.body.questionId || req.query.questionId || 'local-q');
  const userId = String(req.body.userId || req.query.userId || 'dev-user');

  try {
    // upsert user
    await prisma.user.upsert({ where: { user_id: userId }, update: {}, create: { user_id: userId, email: `${userId}@example.com`, password_hash: 'dev', full_name: 'Dev User', role: 'candidate', is_email_verified: true } });

    const existing = await prisma.skillAssessment.findUnique({ where: { assessment_id: assessmentId } });
    if (existing) return res.json({ assessment: existing });

    const assessment = await prisma.skillAssessment.create({
      data: {
        assessment_id: assessmentId,
        candidate_id: userId,
        provider: 'dev-seed',
        questions: [{ question_id: questionId, prompt: 'Dev question', tests: [{ input: '', expected: 'hello' }] } as any] as any,
        answers: [] as any,
        total_questions: 1,
        skill_category: 'programming',
        assessment_type: 'QUICK_CHECK',
      } as any,
    });

    return res.json({ assessment });
  } catch (e) {
    console.error('seed-assessment error', e);
    return res.status(500).json({ error: 'failed to seed assessment' });
  }
});

// Dev-only: emit a realtime submission event (useful to validate SSE without running the worker)
router.post('/emit-event', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const submissionId = String(req.body.submissionId || req.query.submissionId || 'test-submission');
  const status = String(req.body.status || req.query.status || 'COMPLETED');
  const payload = req.body.payload ?? req.query.payload ?? { msg: 'dev emit' };

  try {
    emitSubmissionEvent({ submissionId, status, payload });
    return res.json({ ok: true, submissionId, status, payload });
  } catch (e) {
    console.error('emit-event error', e);
    return res.status(500).json({ error: 'failed to emit' });
  }
});

export default router;

// NOTE: additional dev-only endpoints are defined above. We add two helpers below
// to trigger the company notifier and to resend verification emails without
// modifying production controllers. Both are guarded by ENABLE_DEV_MINT.

router.post('/notify-companies', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  try {
    await runCompanyNotifier();
    return res.json({ ok: true, message: 'Company notifier executed' });
  } catch (e) {
    console.error('notify-companies error', e);
    return res.status(500).json({ error: 'failed to run notifier' });
  }
});

// resend verification by user_id or email (dev only)
router.post('/send-verification', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const { user_id, email } = req.body || {};

  try {
    if (!user_id && !email) {
      return res.status(400).json({ error: 'user_id or email required' });
    }

    let targetUserId = user_id as string | undefined;
    if (!targetUserId && email) {
      const u = await prisma.user.findUnique({ where: { email: String(email) } });
      if (!u) return res.status(404).json({ error: 'user not found' });
      targetUserId = u.user_id;
    }

    await authService.resendVerificationEmail(targetUserId!);
    return res.json({ ok: true, message: 'Verification email queued/sent' });
  } catch (e) {
    console.error('send-verification error', e);
    return res.status(500).json({ error: 'failed to send verification' });
  }
});

// Dev helper: create a company profile for a given user_id (bypasses checkAuth)
// Useful when the frontend flow fails during auth or token handling. This is
// strictly dev-only and requires ENABLE_DEV_MINT=1.
router.post('/dev/create-profile', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const { user_id, profile } = req.body || {};
  if (!user_id || !profile) return res.status(400).json({ error: 'user_id and profile required' });

  try {
    const result = await companyService.createCompanyProfile(user_id, profile);
    return res.json({ ok: true, result });
  } catch (e: any) {
    console.error('dev create-profile error', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

// Dev helper: run the login service directly (bypasses HTTP validation) and
// return the raw service result. Useful to see if the service returns a token
// even if the frontend call is failing.
router.post('/dev/login-test', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const result = await authService.login({ email, password } as any, req);
    return res.json({ ok: true, result });
  } catch (e: any) {
    console.error('dev login-test error', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

// Dev helper: echo request headers/body so frontend payload can be inspected
router.post('/dev/echo', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(403).json({ error: 'Not allowed' });
  }
  return res.json({ headers: req.headers, body: req.body });
});
