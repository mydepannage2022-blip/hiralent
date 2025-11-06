import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireCompanyMember } from '../middlewares/authz.middleware';
import { enqueueAiCompanySetupRecompute } from '../queues/aiCompanySetup.queue';

const router = Router();

// GET /companies/:companyId/insights?latest=1
router.get('/companies/:companyId/insights', requireAuth, requireCompanyMember, async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const latestOnly = ['1', 'true', 'yes'].includes(String(req.query.latest ?? '').toLowerCase());

  const rows = await prisma.businessInsight.findMany({
    where: { target_type: 'company', target_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  if (!latestOnly) return res.json({ items: rows });

  // garder la dernière par catégorie
  const seen = new Set<string>();
  const latestPerCategory = rows.filter(r => {
    const key = r.category;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json({ items: latestPerCategory });
});

// (optional) POST /companies/:companyId/insights/recompute
router.post('/companies/:companyId/insights/recompute', requireAuth, /* requireAdmin, */ async (req, res) => {
  const { companyId } = req.params;
  await enqueueAiCompanySetupRecompute(companyId);
  res.status(202).json({ ok: true, enqueued: true });
});

export default router;
