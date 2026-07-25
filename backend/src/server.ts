import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { connectDB } from "./lib/mongo";
import { loadDevStubs } from "./bootstrap/devStubs";
import { setupSocketIO } from "./realtime/socket.messaging";
import { getScheduler } from "./services/scraping/scraping-scheduler";
import { getInterviewScheduler } from "./scheduler/interview.scheduler";
import { assertCoreSecrets } from "./config/requireEnv";

dotenv.config();

// Fail fast if a core auth secret is missing — a forgeable/known secret is worse
// than a crash. Runs after dotenv.config() so .env values are already loaded.
assertCoreSecrets();

if (process.env.NODE_ENV !== "production") {
  loadDevStubs();
}

(async () => {
  try {
    const mongo = await connectDB();
    app.locals.mongo = mongo;

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

    const server = http.createServer(app);

    const io = setupSocketIO(server);
    app.set("socketio", io);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
