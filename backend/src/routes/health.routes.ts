import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

/**
 * Health probe — GET /health (unauthenticated).
 *
 * Doubles as a liveness and a readiness signal:
 *   - 200 { status: "ok" }        → process up AND Postgres reachable.
 *   - 503 { status: "degraded" }  → process up but a dependency is down.
 * It never throws: a failed dependency check is caught and reported in the body
 * rather than propagated, so hitting /health cannot itself crash the request.
 *
 * Re-added in Session 7 (Wave 0 / Phase 0.8) — the earlier placeholder route was
 * removed in the Session-6 dead-code sweep; the local-run baseline needs a
 * DB-aware probe that a docker healthcheck or the verify-local-run test can poll.
 */
router.get("/health", async (_req: Request, res: Response) => {
  const startedAt = Date.now();

  let db: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  const status = db === "up" ? "ok" : "degraded";
  res.status(db === "up" ? 200 : 503).json({
    status,
    db,
    uptime_s: Math.round(process.uptime()),
    checked_in_ms: Date.now() - startedAt,
    ts: new Date().toISOString(),
  });
});

export default router;
