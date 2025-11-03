import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { onSubmissionEvent } from '../lib/submissionEmitter';

const prisma = new PrismaClient();
const r = Router();

// SSE stream for a single submission updates
r.get('/submissions/stream/:id', async (req: Request, res: Response) => {
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
r.get('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const s = await (prisma as any).codeSubmission.findUnique({ where: { submission_id: req.params.id } });
    if (!s) return res.status(404).end();
    return res.json(s);
  } catch (e) {
    return res.status(500).json({ error: 'internal' });
  }
});

export default r;
