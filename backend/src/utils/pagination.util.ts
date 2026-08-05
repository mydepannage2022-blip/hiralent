// src/utils/pagination.util.ts
//
// One shared pagination primitive for list endpoints (Wave 2 / Phase 2.4, R-20).
//
// Why this exists: the clamp was previously duplicated three ways with *different*
// caps — zod `.max(100)` (message.schema), manual `Math.min(toInt(x),50)`
// (candidate.jobs.validation), and service-level `Math.min(Math.max(x),100)`
// (notification.service). A `?limit=` that skipped a clamp went straight into a
// Prisma `take`, so a single request could pull an entire table into memory. The
// cap now lives in ONE place (`parsePagination`) so a runaway limit can never reach
// the DB, regardless of which endpoint the request hit.
//
// The response *body* shape of existing endpoints is intentionally left untouched
// (frontend consumers read the arrays directly). Pagination metadata is surfaced
// additively via response headers (`setPaginationHeaders`), exposed to the browser
// through the CORS `exposedHeaders` allowlist in app.ts.

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
// Upper bound on `page`. This bounds not just the response size but the DB WORK: `skip`
// becomes a SQL OFFSET, and Postgres must walk+discard every skipped row to reach the page.
// A high ceiling (we previously allowed 100k pages → a ~20M-row OFFSET) let an attacker turn
// a bounded-ROWS endpoint into an unbounded-COST one by repeatedly requesting a very deep
// page. 1000 pages keeps the deepest OFFSET small enough to stay cheap (≈200k rows at the
// largest per-endpoint limit) while being far past any legitimate offset-paging need — deep
// navigation should use filters/cursors, not a five-figure page number. It also keeps `skip`
// well within a safe integer, so a pathological `?page=1e17` can never overflow into a 500.
export const MAX_PAGE = 1000;

export type PaginationInput = {
  page?: unknown;
  limit?: unknown;
};

export type PaginationOptions = {
  /** Default page size when the caller omits `limit`. */
  defaultLimit?: number;
  /** Hard upper bound on page size. A larger `?limit=` is clamped down to this. */
  max?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

/** Coerce an unknown query value to a positive integer, else fall back. */
const toPositiveInt = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

/**
 * Parse `page`/`limit` from a request query and clamp them to safe bounds.
 * This is the single enforcement surface for the row cap — `limit` can never
 * exceed `opts.max` (default {@link MAX_LIMIT}), so a hostile `?limit=99999`
 * yields at most `max` rows.
 */
export const parsePagination = (
  query: PaginationInput | undefined,
  opts: PaginationOptions = {}
): Pagination => {
  const defaultLimit = opts.defaultLimit ?? DEFAULT_LIMIT;
  const max = opts.max ?? MAX_LIMIT;

  const page = Math.min(toPositiveInt(query?.page, 1), MAX_PAGE);
  const rawLimit = toPositiveInt(query?.limit, defaultLimit);
  const limit = Math.min(Math.max(rawLimit, 1), max);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/** Minimal shape we need from an Express response — keeps callers using `res: any` happy. */
type HeaderSettable = { setHeader: (name: string, value: string) => void };

/**
 * Expose pagination metadata additively via response headers, without changing
 * the response body. Requires these header names in the CORS `exposedHeaders`
 * allowlist (app.ts) for a browser to read them cross-origin.
 */
export const setPaginationHeaders = (
  res: HeaderSettable,
  meta: { total: number; page: number; limit: number }
): void => {
  const { total, page, limit } = meta;
  res.setHeader("X-Total-Count", String(total));
  res.setHeader("X-Page", String(page));
  res.setHeader("X-Limit", String(limit));
  res.setHeader("X-Has-More", String(page * limit < total));
};
