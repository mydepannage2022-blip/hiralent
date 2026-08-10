// backend/src/services/signals/website.ts
//
// Website-text signal: fetch a company's public website and extract readable text for the
// onboarding-insight prompt. The URL is user-supplied (company profile), so this is a
// server-side fetch of an attacker-influenced URL — a classic SSRF vector. Defenses:
//
//   - only http/https schemes,
//   - a DNS-validating socket `lookup` that rejects loopback / private / link-local /
//     cloud-metadata IPs on EVERY connection (so redirect hops are validated too),
//   - a request timeout and a response byte cap.
//
// The scraped text is UNTRUSTED and is fenced with promptGuard before it ever reaches the
// LLM (see workers/ai_company_setup.worker.ts). Any failure/block yields '' (no signal),
// never an exception that would break company onboarding.
import http from "http";
import https from "https";
import dns from "dns";
import axios from "axios";
import * as cheerio from "cheerio";
import { optionalEnv } from "../../config/requireEnv";

// Parse a positive-number tunable, falling back to the safe default on a blank OR malformed
// value — a typo'd env must NEVER become NaN and silently disable a timeout / byte cap.
function numEnv(name: string, fallback: number): number {
  const v = Number(optionalEnv(name, String(fallback)));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
const TIMEOUT_MS = () => numEnv("SIGNALS_HTTP_TIMEOUT_MS", 8000);
const MAX_BYTES = () => numEnv("SIGNALS_MAX_BYTES", 2000000);
const SCRAPE_ENABLED = () =>
  (optionalEnv("SIGNALS_SCRAPE_ENABLED", "true") as string).toLowerCase() === "true";
const MAX_TEXT = 8000; // cap the extracted text handed downstream

/**
 * Expand a (possibly compressed) IPv6 literal to its eight 16-bit groups as numbers.
 * Returns null when the string is not a syntactically valid IPv6 address — the caller
 * treats "cannot parse" as unsafe (fail-closed). Handles the `::` run-length compression
 * and a trailing embedded IPv4 (e.g. `::ffff:127.0.0.1`).
 */
function expandIpv6(addr: string): number[] | null {
  let s = addr;
  // A trailing dotted-IPv4 tail (v4-mapped/-compatible) → convert to two hextets.
  const v4tail = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4tail) {
    const o = v4tail[1].split(".").map(Number);
    if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const hi = (o[0] << 8) | o[1];
    const lo = (o[2] << 8) | o[3];
    s = s.slice(0, v4tail.index) + hi.toString(16) + ":" + lo.toString(16);
  }

  const hasCompression = s.includes("::");
  if (hasCompression && s.indexOf("::") !== s.lastIndexOf("::")) return null; // only one "::" allowed
  const [headStr, tailStr = ""] = hasCompression ? s.split("::") : [s, undefined as any];

  const parseGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const gs = part.split(":");
    const out: number[] = [];
    for (const g of gs) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };

  const head = parseGroups(headStr);
  const tail = hasCompression ? parseGroups(tailStr) : [];
  if (head === null || tail === null) return null;

  if (hasCompression) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    return [...head, ...new Array(fill).fill(0), ...tail];
  }
  if (head.length !== 8) return null;
  return head;
}

/**
 * Pure SSRF check for a single resolved IP (v4 or v6). Blocks loopback, private, link-local
 * (incl. the 169.254.169.254 cloud-metadata address), unique-local and unspecified ranges.
 *
 * IPv6 is fully expanded before classification so that compressed/expanded/hex-encoded
 * v4-mapped literals (e.g. `::ffff:7f00:1` = 127.0.0.1, `::ffff:a9fe:a9fe` = metadata,
 * `0:0:0:0:0:0:0:1` = ::1) cannot slip past a naive prefix check. Anything unparseable is
 * treated as unsafe (fail-closed).
 */
export function isBlockedAddress(ip: string): boolean {
  if (!ip) return true;
  // Strip any surrounding brackets (URL.hostname returns IPv6 as "[::1]") and a zone id.
  let addr = ip.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/%.*$/, "");

  if (addr.includes(":")) {
    // IPv6 — expand to 8 groups; unparseable ⇒ unsafe.
    const g = expandIpv6(addr);
    if (!g) return true;

    const isZeroPrefix6 = g.slice(0, 6).every((x) => x === 0);
    // ::/128 unspecified and ::1/128 loopback
    if (isZeroPrefix6 && g[6] === 0 && (g[7] === 0 || g[7] === 1)) return true;
    // v4-mapped ::ffff:0:0/96 and v4-compatible ::/96 — reclassify via the embedded v4.
    if ((g.slice(0, 5).every((x) => x === 0) && (g[5] === 0 || g[5] === 0xffff))) {
      const a = g[6] >> 8, b = g[6] & 0xff, c = g[7] >> 8, d = g[7] & 0xff;
      return isBlockedAddress(`${a}.${b}.${c}.${d}`);
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    return false;
  }

  // IPv4
  const parts = addr.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // not a clean IPv4 literal ⇒ treat as unsafe
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  return false;
}

// DNS-validating lookup used by the http(s) agents. Rejects the connection if ANY resolved
// address is blocked — this runs for the initial request AND for every redirect hop.
function guardedLookup(
  hostname: string,
  options: any,
  cb: (err: NodeJS.ErrnoException | null, address?: any, family?: number) => void
): void {
  const opts = typeof options === "object" && options ? options : { family: options };
  dns.lookup(hostname, { all: true, ...opts }, (err, addresses: any) => {
    if (err) return cb(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: opts.family || 4 }];
    for (const a of list) {
      if (isBlockedAddress(a.address)) {
        return cb(new Error(`SSRF blocked: ${hostname} resolves to non-public ${a.address}`));
      }
    }
    if (opts.all) return cb(null, list as any);
    cb(null, list[0].address, list[0].family);
  });
}

const httpAgent = new http.Agent({ lookup: guardedLookup as any });
const httpsAgent = new https.Agent({ lookup: guardedLookup as any });

/** Reject non-http(s) schemes and IP literals that are obviously internal (fast pre-check). */
export function assertPublicHttpUrl(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Refusing non-http(s) URL: ${u.protocol}`);
  }
  const host = u.hostname.toLowerCase();
  // Block obvious internal names / IP literals up front; the agent lookup is the real guard.
  if (host === "localhost" || host.endsWith(".localhost")) throw new Error("SSRF blocked: localhost");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    if (isBlockedAddress(host)) throw new Error(`SSRF blocked: internal IP ${host}`);
  }
  return u;
}

/** Pure: strip a full HTML document down to readable, whitespace-collapsed text. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html || "");
  $("script, style, noscript, template, svg").remove();
  const text = $("body").length ? $("body").text() : $.root().text();
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Fetch and extract a company website's readable text. Returns '' when scraping is disabled,
 * the URL is missing/unsafe, or the fetch fails — never throws.
 */
export async function fetchWebsiteText(url?: string | null): Promise<string> {
  if (!url || !SCRAPE_ENABLED()) return "";
  let target: URL;
  try {
    target = assertPublicHttpUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return "";
  }
  try {
    const res = await axios.get<string>(target.toString(), {
      timeout: TIMEOUT_MS(),
      maxContentLength: MAX_BYTES(),
      maxBodyLength: MAX_BYTES(),
      maxRedirects: 3,
      responseType: "text",
      httpAgent,
      httpsAgent,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "HiralentBot/1.0 (+company-verification)",
      },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const text = htmlToText(typeof res.data === "string" ? res.data : String(res.data ?? ""));
    return text.slice(0, MAX_TEXT);
  } catch {
    return "";
  }
}
