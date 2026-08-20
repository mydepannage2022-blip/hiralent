import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { loadDevStubs } from "./bootstrap/devStubs";
import { setupSocketIO } from "./realtime/socket.messaging";
import { getScheduler } from "./services/scraping/scraping-scheduler";
import { getInterviewScheduler } from "./scheduler/interview.scheduler";
import { getRetentionScheduler } from "./scheduler/retention.scheduler";
import { getSubscriptionExpiryScheduler } from "./scheduler/subscriptionExpiry.scheduler";
import { getPaymentReconciliationScheduler } from "./scheduler/paymentReconciliation.scheduler";
import { assertCoreSecrets, assertDbPoolConfig } from "./config/requireEnv";
import { assertSafeRunner } from "./services/runner.security";
import { connectDB, disconnectDB } from "./lib/prisma";

dotenv.config();

// Fail fast if a core auth secret is missing — a forgeable/known secret is worse
// than a crash. Runs after dotenv.config() so .env values are already loaded.
assertCoreSecrets();

// Fail fast (in production) if the runtime DATABASE_URL forgot its connection_limit —
// an unbounded pool is the #1 scale blocker this Wave exists to prevent (R-06).
assertDbPoolConfig();

// Fail fast if the code-runner config would let candidate code escape the container in
// production (host execution enabled, or an unauthenticated HTTP runner). See R-03.
assertSafeRunner();

if (process.env.NODE_ENV !== "production") {
  loadDevStubs();
}

/**
 * Open the pool at boot with a few retries. Unlike the old import-time connect, a
 * transient failure here does NOT kill the process: Prisma reconnects lazily on the next
 * query and GET /health reports `db:down` (503) until Postgres recovers, so an orchestrator
 * can manage readiness instead of the app crash-looping on a momentary blip.
 */
async function connectWithRetry(attempts = 5, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await connectDB();
      console.log("✅ Postgres connected");
      return;
    } catch (err) {
      const last = i === attempts;
      console.error(
        `⚠️  DB connect attempt ${i}/${attempts} failed${last ? "" : ` — retrying in ${delayMs}ms`}:`,
        err instanceof Error ? err.message : err
      );
      if (last) {
        console.error("⚠️  Starting anyway; /health will report db:down until Postgres is reachable.");
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

(async () => {
  try {
    await connectWithRetry();

    //  Initialize scheduler once
    const scheduler = getScheduler();

    //  Start cron only if enabled
    if (process.env.SCRAPING_SCHEDULER_ENABLED === "true") {
      scheduler.start();
      console.log("⏰ Scraping scheduler ENABLED");
    } else {
      console.log("⏸️ Scraping scheduler DISABLED (set SCRAPING_SCHEDULER_ENABLED=true)");
    }

    // Initialize and start interview scheduler (always enabled)
    const interviewScheduler = getInterviewScheduler();
    interviewScheduler.start();

    // Firehose retention reaper — OPT-IN (off unless RETENTION_ENABLED=true) so it can
    // never delete data on a deploy that hasn't consciously enabled it. (R-30)
    if (process.env.RETENTION_ENABLED === "true") {
      getRetentionScheduler().start();
      console.log("🧹 Retention scheduler ENABLED");
    } else {
      console.log("⏸️ Retention scheduler DISABLED (set RETENTION_ENABLED=true)");
    }

    // Subscription expiry sweep — ON by default (it deletes nothing, it only stops a lapsed
    // subscription from reading as still-paying for a user who never logs back in). (R-05)
    if (process.env.SUBSCRIPTION_EXPIRY_ENABLED !== "false") {
      getSubscriptionExpiryScheduler().start();
    } else {
      console.log("⏸️ Subscription expiry scheduler DISABLED (SUBSCRIPTION_EXPIRY_ENABLED=false)");
    }

    // Gateway ↔ DB payment reconciliation — ON by default. Read-only: it reports transactions
    // whose status disagrees with Stripe (a missed webhook) and never repairs them itself. (R-05)
    if (process.env.PAYMENT_RECONCILIATION_ENABLED !== "false") {
      getPaymentReconciliationScheduler().start();
    } else {
      console.log("⏸️ Payment reconciliation scheduler DISABLED (PAYMENT_RECONCILIATION_ENABLED=false)");
    }

    const server = http.createServer(app);

    const io = setupSocketIO(server);
    app.set("socketio", io);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });

    // Graceful shutdown: stop accepting connections, then close the shared pool ONCE.
    // Closing the pool here (not in request code) is the correct lifecycle home for it.
    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n${signal} received — shutting down gracefully…`);
      server.close(async () => {
        await disconnectDB();
        console.log("✅ Pool closed. Bye.");
        process.exit(0);
      });
      // Safety net: force-exit if connections don't drain in time.
      setTimeout(() => process.exit(0), 10000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
