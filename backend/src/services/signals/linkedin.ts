// backend/src/services/signals/linkedin.ts
//
// LinkedIn snippet signal — honestly gated, NOT implemented as a scraper.
//
// LinkedIn actively blocks unauthenticated scraping (login walls, HTTP 999, anti-bot) and
// their public data is only accessible via an approved Partner API we don't have. Rather
// than return a fabricated snippet (the old stub returned `"Stub LinkedIn snippet for …"`,
// which reads downstream as real data), we return '' — an honest "no snippet available".
//
// If a Partner API is onboarded later, implement the real fetch here; the consumer already
// treats '' as "no signal" and fences any non-empty value with promptGuard.
export async function fetchLinkedInSnippet(_link?: string | null): Promise<string> {
  // No partner API / no compliant public-scrape path ⇒ no signal (honest, not fabricated).
  return "";
}
