import { Router } from 'express';
import { subscribe } from './push';

const r = Router();

/**
 * GET /api/submissions/:submissionId/stream
 * SSE stream for live updates
 */
r.get('/:submissionId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  // Prevent buffering by proxies
  res.setHeader('X-Accel-Buffering', 'no');
  // @ts-ignore - depends on your server/runtime
  res.flushHeaders?.();
  try { console.debug('[SSE stream] connection opened for', req.params.submissionId); } catch {}

  const unsub = subscribe(req.params.submissionId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // keep-alive comment every 15s to keep proxies from closing idle connections
  const keepAlive = setInterval(() => {
    try { res.write(': keep-alive\n\n'); } catch (e) { /* ignore */ }
  }, 15 * 1000);

  req.on('close', () => {
    try { clearInterval(keepAlive); } catch {}
    try { unsub(); } catch {}
    try { console.debug('[SSE stream] connection closed for', req.params.submissionId); } catch {}
  });
});

export default r;
