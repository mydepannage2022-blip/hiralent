import "dotenv/config";
import { runJobApplicationOutboxOnce } from "./jobApplication-outbox.worker";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("🚀 JobApplicationOutboxWorker started");

  let isRunning = false;

  while (true) {
    if (!isRunning) {
      isRunning = true;
      try {
        const r = await runJobApplicationOutboxOnce(50);
        if (r?.processed) console.log("✅ jobApplication outbox processed:", r.processed);
      } catch (e) {
        console.error("❌ jobApplication outbox error:", e);
      } finally {
        isRunning = false;
      }
    }

    await sleep(3000);
  }
}

main().catch((e) => {
  console.error("❌ worker fatal:", e);
  process.exit(1);
});
