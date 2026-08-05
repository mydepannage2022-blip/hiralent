import type { Request, Response, NextFunction } from 'express';

/**
 * Gate for dev/simulation-only endpoints that must never be reachable in production.
 *
 * Same double-gate the /dev helper routes use (see routes/dev.routes.ts): the route is
 * live ONLY when NODE_ENV !== 'production' AND ENABLE_DEV_MINT === '1'. Anything else
 * gets a 404 — not 403 — so the endpoint's existence isn't even advertised in prod.
 *
 * Mount this FIRST on the route (before any auth middleware) so a disabled endpoint is
 * refused without the caller needing a valid session.
 */
export function devOnly(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MINT !== '1') {
    return res.status(404).json({ error: 'Not found' });
  }
  return next();
}
