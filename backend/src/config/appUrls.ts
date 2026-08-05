// backend/src/config/appUrls.ts
//
// Single source for the app's own external URLs (frontend + backend self URL). R-13.
//
// Before this, the localhost defaults for the frontend URL were duplicated inline as
// `process.env.FRONTEND_URL || 'http://localhost:3000'` across ~18 call sites (email links,
// OAuth redirects, socket CORS), and the backend self URL defaulted inconsistently (one client
// defaulted BACKEND_URL to :4000 while the real port is 5000). Scattered defaults drift: change
// the port once and 18 files disagree. Centralising them means one place to correct per deploy.
//
// Read lazily at CALL time (not module-load) so the value reflects process.env AFTER
// dotenv.config() has run — the same import-ordering reasoning as requireEnv.ts /
// internalServiceAuth.ts. Trailing slashes are trimmed so callers can safely append a path.

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_BACKEND_URL = 'http://localhost:5000';

const trimSlash = (u: string): string => u.replace(/\/+$/, '');

/**
 * Base URL of the user-facing frontend (email links, OAuth redirects, socket CORS origin).
 * Env: FRONTEND_URL. Trailing slash trimmed.
 */
export function getFrontendUrl(): string {
  return trimSlash(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL);
}

/**
 * Base URL of this backend, as reachable by other services (e.g. the document-validator
 * webhook callback). Env: BACKEND_URL. Trailing slash trimmed.
 */
export function getBackendUrl(): string {
  return trimSlash(process.env.BACKEND_URL || DEFAULT_BACKEND_URL);
}
