import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt.util';
// dynamically load worker queue if available, otherwise use a noop fallback
let enqueueRun: (opts: { submissionId: string; assessmentId: string; questionId: string; language: string }) => Promise<void> = async () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore: optional dependency in some build environments
  const q = require('../workers/queue');
  if (q && typeof q.enqueueRun === 'function') {
    enqueueRun = q.enqueueRun;
  }
} catch (e) {
  // module not found — continue with noop
}

const prisma = new PrismaClient();

const r = Router();
const devDebug = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_MINT === '1';

/**
 * POST /api/submissions
 * Body: { assessmentId, questionId, language, code, userId }
 */
r.post('/', async (req, res) => {
  try {
    if (devDebug) console.log('Dev submission body:', JSON.stringify(req.body));
    const { assessmentId, questionId, language, code } = req.body;
    let userId = req.body.userId as string | undefined;

    // If Authorization header is present, prefer deriving userId from the JWT.
    const authHeader = (req.headers.authorization as string) || (req.headers.Authorization as string) || '';
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = verifyToken(token);
        userId = payload.user_id;
      } catch (err) {
        console.error('Auth token error:', err);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    if (!assessmentId || !questionId || !language || !code || !userId) {
      return res.status(400).json({ error: 'assessmentId, questionId, language, code, userId are required' });
    }

    // Defensive checks: ensure referenced rows exist to avoid Prisma FK errors.
    const candidate = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!candidate) {
      return res.status(400).json({ error: `candidate with id ${userId} not found` });
    }

    const assessment = await prisma.skillAssessment.findUnique({ where: { assessment_id: assessmentId } });
    if (!assessment) {
      return res.status(400).json({ error: `assessment with id ${assessmentId} not found` });
    }

    // If assessment.questions is a JSON array, validate questionId exists within it.
    try {
      const qs: any = assessment.questions;
      if (qs && Array.isArray(qs)) {
        const found = qs.find((q: any) => q && (q.question_id === questionId || q.id === questionId));
        if (!found) {
          return res.status(400).json({ error: `question with id ${questionId} not found in assessment ${assessmentId}` });
        }
      }
    } catch (e) {
      // ignore JSON parse errors and continue — question existence can't be validated
    }

    const sub = await (prisma as any).codeSubmission.create({
      data: {
        assessment_id: assessmentId,
        question_id:   questionId,
        language,
        code,
        candidate_id:  userId,
        status:        'PENDING',
      },
    });

    await enqueueRun({
      submissionId: sub.submission_id,
      assessmentId,
      questionId,
      language,
    });

    return res.json({ submissionId: sub.submission_id });
  } catch (err: any) {
    // Log full error for debugging
    console.error('Create submission error:', err && err.stack ? err.stack : err);
    if (devDebug) {
      // In dev mode return stack to help debugging (safe only when ENABLE_DEV_MINT=1)
      return res.status(500).json({ error: 'Internal server error', details: err && err.message ? err.message : String(err), stack: err && err.stack ? err.stack : undefined });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id
 */
r.get('/:id', async (req, res) => {
  try {
    const s = await (prisma as any).codeSubmission.findUnique({
      where: { submission_id: req.params.id },
    });
    if (!s) return res.status(404).end();
    return res.json(s);
  } catch (err) {
    console.error('Get submission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default r;
