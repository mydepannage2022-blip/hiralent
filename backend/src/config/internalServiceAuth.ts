// backend/src/config/internalServiceAuth.ts
//
// Shared header for backend → Python internal service calls. Wave 1 / Phase 1.7.
//
// The Python services (ai-service, assessment-ai, document-validator, job-creation-ai)
// guard their inbound endpoints with a shared secret in the `X-API-Token` header
// (env INTERNAL_API_TOKEN, fail-closed on their side). Every outbound client spreads
// internalTokenHeader() into its request headers so legitimate backend calls carry it.
//
// Read lazily at CALL time (not module-load) to avoid the import-ordering pitfall where
// a client module could evaluate before dotenv.config() has populated process.env — the
// same reasoning as requireEnv.ts. When the token is unset we attach nothing and let the
// Python side reject with a clean 403/500, rather than throwing here and turning an
// optional AI call into a backend 500.

/**
 * Header carrying the internal service token, or `{}` when INTERNAL_API_TOKEN is unset.
 * Spread into an outbound request's headers: `{ ...internalTokenHeader() }`.
 */
export function internalTokenHeader(): Record<string, string> {
  const token = process.env.INTERNAL_API_TOKEN;
  if (token === undefined || token.trim() === '') return {};
  return { 'X-API-Token': token };
}
