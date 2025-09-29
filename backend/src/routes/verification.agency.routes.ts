import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { checkAuth } from '../middlewares/checkAuth.middleware';
// Update the import path or filename as needed to match the actual file location and name
// Update the import path or filename as needed to match the actual file location and name
import { VerificationService } from '../services/verification.service';
import { PrismaClient } from '@prisma/client';

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

const prisma = new PrismaClient();
const service = new VerificationService(prisma);

const router = Router();

router.use(checkAuth);

router.put('/:id/verification', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SaveDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  try {
    const result = await service.saveDraft('AGENCY', id, parsed.data);
    res.status(200).json({ ok: true, verification: { id: result.verification_id, status: result.status } });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

router.post('/:id/verification/submit', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SubmitSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  try {
    const { runId, verificationId } = await service.submit('AGENCY', id);
    await service.enqueueRun({ runId, subject: 'AGENCY', subjectId: id });

    res.status(202).json({ ok: true, verificationId, runId });
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

router.get('/:id/verification/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const data = await service.getStatus('AGENCY', id);
    res.json(data);
  } catch (e: any) {
    res.status(e?.status || 400).json({ error: e?.message || 'Bad Request' });
  }
});

export default router;
