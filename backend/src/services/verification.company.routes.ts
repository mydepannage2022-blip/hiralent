import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { checkAuth } from '../middlewares/checkAuth.middleware';
// ✅ adjust path to your services folder (most likely ../services)
import { VerificationService } from '../services/verification.service';
// ✅ import the shared Prisma client
import prisma from '../lib/prisma';

const router = Router();

// ✅ Use the shared prisma instance
const service = new VerificationService(prisma);

/** Inline validation (Zod) */
const SaveDraftSchema = z.object({
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .optional(),
  details: z.record(z.any()).optional(),
});

const SubmitSchema = z.object({
  attestations: z
    .object({
      accurateInformation: z.boolean().default(true),
    })
    .optional(),
});

// Require auth for all routes in this module
router.use(checkAuth);

/**
 * PUT /api/v1/companies/:id/verification
 * Save/overwrite draft verification details (documents/metadata)
 */
router.put('/:id/verification', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SaveDraftSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.format() });

  try {
    const v = await service.saveDraft('COMPANY', id, parsed.data.details);
    res
      .status(200)
      .json({ ok: true, verification: { id: v.verification_id, status: v.status } });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

/**
 * POST /api/v1/companies/:id/verification/submit
 * Lock inputs, snapshot, create run (QUEUED)
 */
router.post('/:id/verification/submit', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SubmitSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.format() });

  try {
    const { runId, verificationId } = await service.submit('COMPANY', id);
    // enqueue your background job here if you have a queue
    res.status(202).json({ ok: true, verificationId, runId });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

/**
 * GET /api/v1/companies/:id/verification/status
 * Return latest case status + risk_score + reason_codes + latest run summary
 */
router.get('/:id/verification/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const data = await service.getStatus('COMPANY', id);
    res.json(data);
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

export default router;
