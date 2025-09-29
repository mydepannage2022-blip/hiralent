import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { checkAuth } from '../middlewares/checkAuth.middleware';
// Make sure the file exists at ../services/verification.service.ts or adjust the import path accordingly.
// Update the import path if the file is located elsewhere, for example:
import { VerificationService } from '../services/verification.service';
import { PrismaClient } from '@prisma/client'; // Add this import

// (optional) request body validation
const SaveDraftSchema = z.object({
  documents: z.array(z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    note: z.string().optional(),
  })).optional(),
  details: z.record(z.any()).optional(),
});
const SubmitSchema = z.object({
  attestations: z.object({
    accurateInformation: z.boolean().default(true),
  }).optional(),
});

const router = Router();
const prisma = new PrismaClient();
const service = new VerificationService(prisma);

// All endpoints require auth (same as your file style)
router.use(checkAuth);

/**
 * PUT /api/v1/companies/:id/verification
 * Save/overwrite draft verification details (documents/metadata)
 */
router.put('/:id/verification', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SaveDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  try {
    // If your auth includes multi-tenant checks, do them here (owner/admin/etc.)
    const result = await service.saveDraft('COMPANY', id, parsed.data);
    res.status(200).json({ ok: true, verification: { id: result.verification_id, status: result.status } });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

/**
 * POST /api/v1/companies/:id/verification/submit
 * Lock inputs, snapshot, create run, enqueue background job
 */
router.post('/:id/verification/submit', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SubmitSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  try {
    const { runId, verificationId } = await service.submit('COMPANY', id);
    // service.submit does the DB work; enqueue actually happens inside the service or route.
    await service.enqueueRun({ runId, subject: 'COMPANY', subjectId: id });

    res.status(202).json({ ok: true, verificationId, runId });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

/**
 * GET /api/v1/companies/:id/verification/status
 * Return latest status + risk_score + reason_codes
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
