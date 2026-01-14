import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Body expected from Python when starting a run:
 * {
 *   run_id: string,
 *   triggered_by_user_id?: string | null,
 *   sources: string[],
 *   query?: string | null,
 *   filters?: any | null
 * }
 */
export async function createSourcingRunService(body: any) {
  const run_id = body?.run_id;
  if (!run_id || typeof run_id !== "string") {
    throw new Error("run_id is required");
  }

  const sources = body?.sources;
  if (!Array.isArray(sources) || sources.some((s) => typeof s !== "string")) {
    throw new Error("sources must be string[]");
  }

  const created = await prisma.sourcingRun.create({
    data: {
      run_id,
      status: "RUNNING",
      triggered_by_user_id: body?.triggered_by_user_id ?? null,
      sources,
      query: body?.query ?? null,
      filters: body?.filters ?? null,
      started_at: new Date(),
    },
    select: { run_id: true, status: true },
  });

  return created;
}

/**
 * Body expected from Python for each item:
 * {
 *   sourced_candidate_id?: string | null,
 *   source: string,
 *   source_uid?: string | null,
 *   action: "created"|"updated"|"skipped"|"failed",
 *   reason?: string | null,
 *   raw?: any | null
 * }
 */
export async function addRunItemService(run_id: string, body: any) {
  // Ensure run exists (optional strictness)
  const run = await prisma.sourcingRun.findUnique({
    where: { run_id },
    select: { run_id: true },
  });
  if (!run) throw new Error(`Run not found: ${run_id}`);

  const source = body?.source;
  const action = body?.action;

  if (!source || typeof source !== "string") throw new Error("source is required");
  if (!action || typeof action !== "string") throw new Error("action is required");

  const created = await prisma.sourcingRunItem.create({
    data: {
      run_id,
      sourced_candidate_id: body?.sourced_candidate_id ?? null,
      source,
      source_uid: body?.source_uid ?? null,
      action,
      reason: body?.reason ?? null,
      raw: body?.raw ?? null,
      created_at: new Date(),
    },
    select: { item_id: true, run_id: true },
  });

  return created;
}

/**
 * Body expected from Python at end:
 * {
 *   status: "COMPLETED"|"FAILED",
 *   total_found?: number,
 *   total_saved?: number,
 *   total_skipped?: number,
 *   error?: string | null
 * }
 */
export async function completeSourcingRunService(run_id: string, body: any) {
  const status = body?.status;
  if (status !== "COMPLETED" && status !== "FAILED") {
    throw new Error("status must be COMPLETED or FAILED");
  }

  const updated = await prisma.sourcingRun.update({
    where: { run_id },
    data: {
      status,
      total_found: typeof body?.total_found === "number" ? body.total_found : undefined,
      total_saved: typeof body?.total_saved === "number" ? body.total_saved : undefined,
      total_skipped: typeof body?.total_skipped === "number" ? body.total_skipped : undefined,
      error: body?.error ?? null,
      ended_at: new Date(),
    },
    select: {
      run_id: true,
      status: true,
      total_found: true,
      total_saved: true,
      total_skipped: true,
      ended_at: true,
      error: true,
    },
  });

  return updated;
}
