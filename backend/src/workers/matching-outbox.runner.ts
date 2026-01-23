import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { MatchingOutboxWorker } from "./matching-outbox.worker";
import { createMatchingAIServiceClient } from "../clients/matching-ai-service.client";

const prisma = new PrismaClient();
const matchingClient = createMatchingAIServiceClient();
const worker = new MatchingOutboxWorker(prisma, matchingClient);


async function main() {
  console.log("🚀 MatchingOutboxWorker started");
  console.log("ENV CHECK", {
    MATCHING_AI_BASE_URL: process.env.MATCHING_AI_BASE_URL,
    INTERNAL_SERVICE_KEY_LEN: (process.env.INTERNAL_SERVICE_KEY || "").length,
  });
  console.log("KEY =", JSON.stringify(process.env.INTERNAL_SERVICE_KEY), "LEN =", (process.env.INTERNAL_SERVICE_KEY || "").length);
  setInterval(async () => {
    try {
      await worker.tick();
    } catch (e) {
      console.error("❌ Worker error", e);
    }
  }, 3000); // every 3 seconds
}

main();
