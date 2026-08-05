import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { onSubmissionEvent } from '../lib/submissionEmitter';
import { checkAuth, AuthenticatedRequest } from '../middlewares/checkAuth.middleware';
import { denyIfNotOwnSubmission } from '../middlewares/submissionOwnership.middleware';
import { signStreamTicket, verifyStreamTicket } from '../utils/streamTicket';

const r = Router();

// Mint a short-lived, single-submission stream ticket. Gated by the full auth + ownership
// stack, so only the owner can obtain a ticket for their own submission. The browser then
// opens the EventSource with ?ticket=<this> instead of putting its real access token in the URL.
r.post('/submissions/stream-ticket/:id', checkAuth, denyIfNotOwnSubmission, (req: AuthenticatedRequest, res: Response) => {
  const ticket = signStreamTicket(req.params.id, req.user!.user_id);
  return res.json({ ticket });
});

// Verify a stream ticket from ?ticket=. The ticket is bound to (submissionId, userId) and
// signed, so a valid ticket whose submissionId matches the path IS proof of ownership —
// no DB re-check needed. No/expired/tampered/wrong-submission ticket => 401.
const requireStreamTicket = (req: Request, res: Response, next: NextFunction) => {
  const raw = req.query.ticket;
  const token = typeof raw === 'string' ? raw : '';
  const parsed = token ? verifyStreamTicket(token) : null;
  if (!parsed || parsed.submissionId !== req.params.id) {
    return res.status(401).json({ error: true, message: 'Invalid or expired stream ticket' });
  }
  return next();
};

// SSE stream for a single submission's updates.
// EventSource can't send an Authorization header, so authorization rides on a signed,
// short-lived, submission-bound ticket (minted above behind checkAuth + ownership).
r.get('/submissions/stream/:id', requireStreamTicket, async (req: Request, res: Response) => {
  const id = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  // Prevent buffering by some reverse proxies (nginx, etc.) which may delay streaming
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  
  try { console.debug('[SSE] connection opened for', id); } catch {}
  // initial send current state
  try {
    const s = await (prisma as any).codeSubmission.findUnique({ where: { submission_id: id } });
    if (s) {
      const initialPayload = { type: 'initial', submission: s };
      try { console.debug('[SSE] sending initial for', id); } catch {}
      res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);
    }
  } catch (e) {
    // ignore
  }

  const unsub = onSubmissionEvent(id, (ev) => {
    try { console.debug('[SSE] sending event for', id, ev && ev.status); } catch {}
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  });

  // send a lightweight comment keep-alive every 15s to prevent proxies from closing the connection
  const keepAlive = setInterval(() => {
    try {
      // a leading ':' is a valid SSE comment and is ignored by EventSource clients
      res.write(': keep-alive\n\n');
    } catch (e) {
      // ignore write errors
    }
  }, 15 * 1000);

  req.on('close', () => {
    try { clearInterval(keepAlive); } catch {}
    try { unsub(); } catch {}
    try { res.end(); } catch {}
    try { console.debug('[SSE] connection closed for', id); } catch {}
  });
});

// convenience: GET submission current
r.get('/submissions/:id', checkAuth, denyIfNotOwnSubmission, async (req: Request, res: Response) => {
  try {
    const s = await (prisma as any).codeSubmission.findUnique({ where: { submission_id: req.params.id } });
    if (!s) return res.status(404).end();
    return res.json(s);
  } catch (e) {
    return res.status(500).json({ error: 'internal' });
  }
});

export default r;
