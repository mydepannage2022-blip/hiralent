// src/scripts/sync-to-library-db.ts
/**
 * Syncs library questions from main DB to a separate library DB
 * 
 * Setup:
 * 1. Create a separate database: CREATE DATABASE hiralent_library;
 * 2. Run migrations on library DB: DATABASE_URL="postgresql://..." npx prisma migrate deploy
 * 3. Add LIBRARY_DATABASE_URL to .env
 * 4. Run this script to sync
 */

import { PrismaClient } from "@prisma/client";
import mainDb from "../lib/prisma";

// NOTE: libraryDb points at a SEPARATE database (LIBRARY_DATABASE_URL), so it
// legitimately keeps its own PrismaClient. This is the ONE allowlisted client
// outside lib/prisma.ts (see verify-prisma-singleton.mjs). mainDb uses the shared singleton.
const libraryDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LIBRARY_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🔄 Syncing Library Questions to Library DB\n");
  console.log("=".repeat(60));

  // 1. Get all library questions from main DB
  const libraryQuestions = await mainDb.question.findMany({
    where: {
      OR: [
        { source: "library_ai_coding" },
        { source: "library_ai_mcq" },
        { source: "web_scraped" },
        { isLibraryQuestion: true },
      ],
    },
  });

  console.log(`\n📊 Found ${libraryQuestions.length} library questions in main DB\n`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  // 2. Sync to library DB
  for (const q of libraryQuestions) {
    try {
      await libraryDb.question.upsert({
        where: { id: q.id },
        create: {
          ...q,
          createdBy: "system",
        },
        update: {
          ...q,
          createdBy: "system",
        },
      });
      synced++;
      if (synced % 100 === 0) {
        console.log(`   Synced ${synced}/${libraryQuestions.length}...`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error syncing ${q.id}:`, error.message);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Sync Complete!\n");
  console.log(`   Synced: ${synced}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log("\n=".repeat(60) + "\n");

  await mainDb.$disconnect();
  await libraryDb.$disconnect();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});