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
// When set to '1' in .env, skip existence checks for candidate/assessment to ease local dev debugging.
const DEV_BYPASS_CREATE_SUBMISSION = process.env.DEV_BYPASS_CREATE_SUBMISSION === '1';

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

    // Defensive checks: ensure referenced rows exist to avoid FK errors.
    if (!DEV_BYPASS_CREATE_SUBMISSION) {
      const candidate = await prisma.user.findUnique({ where: { user_id: userId } });
      if (!candidate) return res.status(400).json({ error: `candidate with id ${userId} not found` });

      const assessment = await prisma.skillAssessment.findUnique({ where: { assessment_id: assessmentId } });
      if (!assessment) return res.status(400).json({ error: `assessment with id ${assessmentId} not found` });
    } else {
      if (devDebug) console.warn('DEV_BYPASS_CREATE_SUBMISSION enabled — skipping candidate/assessment existence checks');
    }

    // create submission (use Prisma model if available)
    const now = new Date();
    let sub: any = null;

    if ((prisma as any).codeSubmission && typeof (prisma as any).codeSubmission.create === 'function') {
      if (devDebug) console.log('Using Prisma model for CodeSubmission');
      sub = await (prisma as any).codeSubmission.create({
        data: {
          assessment_id: assessmentId,
          question_id: questionId,
          language,
          code,
          candidate_id: userId,
          status: 'PENDING',
        },
      });
    } else {
      // dev fallback: detect submission_id column type if table exists,
      // then insert using an explicit id cast when necessary. If table
      // doesn't exist create it with uuid PK and retry.
      if (devDebug) console.warn('Prisma CodeSubmission model not available; using SQL fallback (dev only)');
      const id = require('crypto').randomUUID();
      try {
        // check column type
        const infoRows: any = await prisma.$queryRaw`
          SELECT data_type, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'code_submissions' AND column_name = 'submission_id'
        `;
        const info = Array.isArray(infoRows) ? infoRows[0] : infoRows;
        if (!info) {
          // table missing -> create with uuid PK
          if (devDebug) console.warn('code_submissions table missing — creating table with uuid PK (dev only)');
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS code_submissions (
              submission_id uuid PRIMARY KEY,
              assessment_id text NOT NULL,
              candidate_id text NOT NULL,
              question_id text NOT NULL,
              language text NOT NULL,
              code text NOT NULL,
              status text NOT NULL,
              score double precision,
              runtime_ms integer,
              memory_kb integer,
              plagiarism_risk double precision,
              evidence jsonb,
              created_at timestamptz DEFAULT now(),
              updated_at timestamptz DEFAULT now()
            );
          `);
          // insert using cast to uuid
          const rows: any = await prisma.$queryRaw`
            INSERT INTO "code_submissions" ("submission_id","assessment_id","candidate_id","question_id","language","code","status","created_at","updated_at")
            VALUES (CAST(${id} AS uuid), ${assessmentId}, ${userId}, ${questionId}, ${language}, ${code}, 'PENDING', ${now}, ${now})
            RETURNING submission_id
          `;
          const returned = Array.isArray(rows) ? rows[0] : rows;
          const generatedId = returned && (returned.submission_id || returned[0]) || id;
          sub = { submission_id: generatedId, assessment_id: assessmentId, candidate_id: userId, question_id: questionId, language, code, status: 'PENDING', created_at: now, updated_at: now } as any;
        } else if (info.data_type === 'uuid') {
          // existing table with uuid PK — insert casting our id
          const rows: any = await prisma.$queryRaw`
            INSERT INTO "code_submissions" ("submission_id","assessment_id","candidate_id","question_id","language","code","status","created_at","updated_at")
            VALUES (CAST(${id} AS uuid), ${assessmentId}, ${userId}, ${questionId}, ${language}, ${code}, 'PENDING', ${now}, ${now})
            RETURNING submission_id
          `;
          const returned = Array.isArray(rows) ? rows[0] : rows;
          const generatedId = returned && (returned.submission_id || returned[0]) || id;
          sub = { submission_id: generatedId, assessment_id: assessmentId, candidate_id: userId, question_id: questionId, language, code, status: 'PENDING', created_at: now, updated_at: now } as any;
        } else {
          // treat as text PK
          await prisma.$executeRaw`
            INSERT INTO "code_submissions" ("submission_id","assessment_id","candidate_id","question_id","language","code","status","created_at","updated_at")
            VALUES (${id}, ${assessmentId}, ${userId}, ${questionId}, ${language}, ${code}, 'PENDING', ${now}, ${now})
          `;
          sub = { submission_id: id, assessment_id: assessmentId, candidate_id: userId, question_id: questionId, language, code, status: 'PENDING', created_at: now, updated_at: now } as any;
        }
      } catch (e: any) {
        // bubble up unexpected errors to outer handler
        throw e;
      }
    }

    // enqueue for processing
    await enqueueRun({ submissionId: sub.submission_id, assessmentId, questionId, language });

    return res.json({ submissionId: sub.submission_id });
  } catch (err: any) {
    console.error('Create submission error:', err && err.stack ? err.stack : err);
    if (devDebug) {
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
    let s: any;
    if ((prisma as any).codeSubmission && typeof (prisma as any).codeSubmission.findUnique === 'function') {
      s = await (prisma as any).codeSubmission.findUnique({ where: { submission_id: req.params.id } });
    } else {
      if (devDebug) console.warn('Prisma CodeSubmission model not available; using SQL fallback for GET');
      const rows: any = await prisma.$queryRaw`
        SELECT * FROM "code_submissions" WHERE "submission_id" = ${req.params.id} LIMIT 1
      `;
      s = Array.isArray(rows) ? rows[0] : rows;
    }
    if (!s) return res.status(404).end();
    return res.json(s);
  } catch (err) {
    console.error('Get submission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default r;
