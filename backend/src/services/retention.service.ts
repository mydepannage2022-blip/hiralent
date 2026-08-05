// src/services/retention.service.ts
//
// Firehose retention (Wave 2 / Phase 2.4, R-30).
//
// Append-only / high-write tables grow forever — nothing reaps them today. This defines
// a per-table retention POLICY and a batched, opt-in reaper. It is OFF by default
// (`RETENTION_ENABLED` must be `true`) so it can never delete data on an unaware deploy.
//
// Two cutoff modes, both via `retentionDays`:
//   - retentionDays = 0  → delete rows whose `expires_at` is already in the past
//                          (dead tokens / expired sessions). cutoff = now.
//   - retentionDays > 0  → delete rows whose age column is older than N days
//                          (telemetry / logs). cutoff = now - N days.
//
// Deletes run in bounded batches (find a page of PKs → deleteMany by id) so the first
// run on a large table never takes a single table-wide write lock.

import prisma from "../lib/prisma";

export type RetentionPolicy = {
  /** Human label for logs. */
  label: string;
  /** Prisma model delegate key, e.g. "jwtBlacklist". */
  model: string;
  /** Primary-key field, used to delete in batches. */
  idField: string;
  /** Timestamp column the cutoff is compared against. */
  ageField: string;
  /** 0 = reap already-expired (cutoff = now); >0 = reap older than N days. */
  retentionDays: number;
};

// Curated policy set. Age columns here are already indexed (Session 4), so the
// `WHERE ageField < cutoff` scan and the batched deletes are index-driven.
export const RETENTION_POLICIES: RetentionPolicy[] = [
  { label: "expired blacklisted tokens", model: "jwtBlacklist", idField: "id", ageField: "expires_at", retentionDays: 0 },
  { label: "expired user sessions", model: "userSession", idField: "session_id", ageField: "expires_at", retentionDays: 0 },
  { label: "usage analytics", model: "usageAnalytics", idField: "usage_id", ageField: "timestamp", retentionDays: 180 },
  { label: "communication logs", model: "communicationLog", idField: "log_id", ageField: "created_at", retentionDays: 180 },
  { label: "admin audit log", model: "adminAuditLog", idField: "log_id", ageField: "created_at", retentionDays: 365 },
  { label: "notifications", model: "notification", idField: "notification_id", ageField: "created_at", retentionDays: 90 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 5000;
const MAX_BATCHES = 1000; // hard backstop against an unbounded loop

export type RetentionResult = { label: string; model: string; deleted: number };

/**
 * Apply a single retention policy in bounded batches. `now` is injectable so tests can
 * pin the cutoff deterministically. Returns the number of rows deleted.
 */
export const applyRetentionPolicy = async (
  policy: RetentionPolicy,
  now: Date = new Date(),
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<number> => {
  const cutoff = new Date(now.getTime() - policy.retentionDays * DAY_MS);
  const delegate = (prisma as any)[policy.model];
  if (!delegate?.findMany || !delegate?.deleteMany) {
    throw new Error(`retention: unknown Prisma model delegate "${policy.model}"`);
  }

  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows: Array<Record<string, unknown>> = await delegate.findMany({
      where: { [policy.ageField]: { lt: cutoff } },
      select: { [policy.idField]: true },
      take: batchSize,
    });
    if (rows.length === 0) break;

    const ids = rows.map((r) => r[policy.idField]);
    const res = await delegate.deleteMany({ where: { [policy.idField]: { in: ids } } });
    deleted += res.count;

    if (rows.length < batchSize) break;
  }
  return deleted;
};

/**
 * Run every retention policy. Failures on one policy are logged and do not abort the
 * rest (a firehose table filling disk shouldn't be blocked by an unrelated policy error).
 */
export const runRetention = async (now: Date = new Date()): Promise<RetentionResult[]> => {
  const results: RetentionResult[] = [];
  for (const policy of RETENTION_POLICIES) {
    try {
      const deleted = await applyRetentionPolicy(policy, now);
      results.push({ label: policy.label, model: policy.model, deleted });
    } catch (err) {
      console.error(`❌ [retention] policy "${policy.label}" failed:`, err);
      results.push({ label: policy.label, model: policy.model, deleted: -1 });
    }
  }
  return results;
};
