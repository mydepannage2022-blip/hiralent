// backend/src/services/signals/whois.ts
//
// Domain-age signal via RDAP (Registration Data Access Protocol) — the modern, JSON,
// keyless replacement for legacy WHOIS. We hit rdap.org (a bootstrap redirector that
// forwards to the authoritative registry for the TLD) and read the "registration" event.
//
// Honest by design: if the TLD has no RDAP server, the domain isn't found, the response
// has no registration event, or the network call fails/times out, we return `null`
// (unknown) rather than a fabricated age. The consumer treats null as "no signal".
import axios from "axios";
import { optionalEnv } from "../../config/requireEnv";

const RDAP_BASE = () =>
  (optionalEnv("SIGNALS_RDAP_BASE", "https://rdap.org") as string).replace(/\/+$/, "");
// Safe positive-number parse: a malformed SIGNALS_HTTP_TIMEOUT_MS must not become NaN and
// disable the request timeout.
const TIMEOUT_MS = () => {
  const v = Number(optionalEnv("SIGNALS_HTTP_TIMEOUT_MS", "8000"));
  return Number.isFinite(v) && v > 0 ? v : 8000;
};

type RdapEvent = { eventAction?: string; eventDate?: string };
type RdapResponse = { events?: RdapEvent[] };

/**
 * Pure: given an RDAP response and a reference timestamp, return the domain age in whole
 * months (floored), or null if there is no usable registration date. Kept separate from the
 * network call so it is deterministically unit-testable without hitting the internet.
 */
export function computeMonthsFromRdap(
  rdap: RdapResponse | null | undefined,
  nowMs: number
): number | null {
  const events = rdap?.events;
  if (!Array.isArray(events)) return null;
  const reg = events.find(
    (e) => (e?.eventAction || "").toLowerCase() === "registration"
  );
  if (!reg?.eventDate) return null;
  const regMs = Date.parse(reg.eventDate);
  if (!Number.isFinite(regMs)) return null;
  const diffMs = nowMs - regMs;
  if (diffMs < 0) return null; // registration date in the future ⇒ not a usable signal
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  return months;
}

/** Extract the registrable-ish host (strip scheme, path, and a leading "www."). */
export function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Real domain-age lookup in months, or null when unknown. Never throws — a failed lookup
 * is a missing signal, not an error that should break company onboarding.
 */
export async function fetchDomainAgeMonths(
  url?: string | null
): Promise<number | null> {
  const domain = domainFromUrl(url);
  if (!domain) return null;
  try {
    const res = await axios.get<RdapResponse>(
      `${RDAP_BASE()}/domain/${encodeURIComponent(domain)}`,
      {
        timeout: TIMEOUT_MS(),
        headers: { Accept: "application/rdap+json, application/json" },
        // rdap.org 302-redirects to the registry's RDAP endpoint; follow it.
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 300,
        // Bound the response so a misconfigured/hostile RDAP endpoint can't stream an
        // unbounded body into memory (Wave 4 review) — RDAP JSON is small.
        maxContentLength: 1_000_000,
        maxBodyLength: 1_000_000,
      }
    );
    return computeMonthsFromRdap(res.data, Date.now());
  } catch {
    return null;
  }
}
