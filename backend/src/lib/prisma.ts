import { PrismaClient } from '@prisma/client';

// The ONE shared PrismaClient for the whole backend process (R-06). Constructing a
// second one anywhere in src/** is a CI-gated error (verify-prisma-singleton.mjs).
//
// Pool sizing is intentionally NOT hard-coded here: it is bounded by the
// `connection_limit` / `pool_timeout` params on DATABASE_URL (see backend/.env.example),
// and a boot-time guard (assertDbPoolConfig in config/requireEnv) refuses to start a
// production process whose URL forgot them. Keeping it in the URL lets a deploy tune the
// pool without a code change.
const prisma = new PrismaClient();

/**
 * Eagerly open the connection pool. OPTIONAL: Prisma otherwise connects lazily on the
 * first query, so the server is fully functional even if this is never called or fails.
 *
 * Why this is a function and no longer runs at import time: the previous version called
 * `connectDB()` as a top-level side-effect and did `process.exit(1)` on any failure. That
 * turned a momentary DB blip (or a rolling Postgres restart) into a full process kill, and
 * made every standalone script/test that merely `import`s this module crash if the DB was
 * briefly unreachable. Startup now decides how to react (retry, warn, stay up for the
 * orchestrator's health checks); the module import itself is side-effect-free.
 */
export async function connectDB(): Promise<void> {
  await prisma.$connect();
}

/**
 * Close the shared pool exactly once, on graceful process shutdown (SIGTERM/SIGINT).
 * Never call this from request-serving code — it would tear the pool down for every
 * other in-flight request (also CI-gated in verify-prisma-singleton.mjs).
 */
export async function disconnectDB(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    /* already disconnected */
  }
}

export default prisma;
