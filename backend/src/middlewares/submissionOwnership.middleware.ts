import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './checkAuth.middleware';

/**
 * Ownership guard for a single code submission (IDOR close).
 *
 * A CodeSubmission belongs to the candidate who created it (`candidate_id`). Reads
 * of `/submissions/:id` (JSON + SSE stream) must be restricted to that owner —
 * otherwise any authenticated user could read another user's submission just by id.
 *
 * Must run AFTER an auth guard (checkAuth or checkAuthQueryToken) so `req.user` is set.
 * Mirrors the model-or-raw-SQL access pattern used in routes/submissions.ts so it
 * works whether or not the Prisma CodeSubmission model is generated in this build.
 *
 *   - missing req.user  -> 401 (defensive; auth guard should have caught it)
 *   - submission absent -> 404
 *   - owned by someone else -> 403
 */
export const denyIfNotOwnSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.user_id) {
      return res.status(401).json({ error: true, message: 'Access token required' });
    }

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: true, message: 'submission id is required' });
    }

    let candidateId: string | undefined;
    const client: any = prisma;
    if (client.codeSubmission && typeof client.codeSubmission.findUnique === 'function') {
      const sub = await client.codeSubmission.findUnique({
        where: { submission_id: id },
        select: { candidate_id: true },
      });
      candidateId = sub?.candidate_id;
    } else {
      const rows: any = await client.$queryRaw`
        SELECT "candidate_id" FROM "code_submissions" WHERE "submission_id" = ${id} LIMIT 1
      `;
      const row = Array.isArray(rows) ? rows[0] : rows;
      candidateId = row?.candidate_id;
    }

    if (!candidateId) {
      return res.status(404).json({ error: true, message: 'Submission not found' });
    }

    if (candidateId !== req.user.user_id) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }

    next();
  } catch (error: any) {
    console.error('❌ Submission ownership check error:', error);
    return res.status(500).json({ error: true, message: 'Ownership check failed' });
  }
};
