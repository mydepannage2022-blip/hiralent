// src/scripts/reset-generation-status.ts
import prisma from '../lib/prisma';


async function main() {
  const args = process.argv.slice(2);
  
  console.log("🔄 Reset Generation Status\n");
  console.log("=".repeat(60));

  if (args.includes("--help") || args.length === 0) {
    console.log(`
Usage: npx ts-node src/scripts/reset-generation-status.ts [options]

Options:
  --reset-patterns          Reset AlgorithmPattern.questionsGenerated to false
  --delete-pattern-questions Delete questions generated from patterns
  --source <source>         Only reset specific source (stackoverflow, leetcode, etc.)
  --confirm                 Required to actually perform the reset
  --help                    Show this help

Examples:
  # Check what will be reset (dry run)
  npx ts-node src/scripts/reset-generation-status.ts --reset-patterns

  # Actually reset pattern flags
  npx ts-node src/scripts/reset-generation-status.ts --reset-patterns --confirm

  # Delete pattern questions and reset flags
  npx ts-node src/scripts/reset-generation-status.ts --reset-patterns --delete-pattern-questions --confirm

  # Reset only stackoverflow patterns
  npx ts-node src/scripts/reset-generation-status.ts --reset-patterns --source stackoverflow --confirm
    `);
    process.exit(0);
  }

  const resetPatterns = args.includes("--reset-patterns");
  const deleteQuestions = args.includes("--delete-pattern-questions");
  const source = args.includes("--source") ? args[args.indexOf("--source") + 1] : undefined;
  const confirm = args.includes("--confirm");

  if (!resetPatterns && !deleteQuestions) {
    console.log("❌ Please specify at least one action:");
    console.log("   --reset-patterns");
    console.log("   --delete-pattern-questions");
    console.log("\nUse --help for more info");
    process.exit(1);
  }

  // Show what will be affected
  const whereClause = source ? { source } : {};
  
  const patternsToReset = await prisma.algorithmPattern.count({
    where: { ...whereClause, questionsGenerated: true }
  });
  
  const questionsToDelete = await prisma.question.count({
    where: {
      generatedFromPattern: true,
      ...(source ? { source: "web_scraped", metadata: { path: ["patternSource"], equals: source } } : {})
    }
  });

  console.log("\n📊 IMPACT ANALYSIS:");
  if (source) {
    console.log(`   Source filter: ${source}`);
  }
  if (resetPatterns) {
    console.log(`   Patterns to reset: ${patternsToReset}`);
  }
  if (deleteQuestions) {
    console.log(`   Questions to delete: ${questionsToDelete}`);
  }

  if (!confirm) {
    console.log("\n⚠️  DRY RUN MODE - No changes will be made");
    console.log("   Add --confirm to actually perform the reset");
    console.log("\n" + "=".repeat(60));
    process.exit(0);
  }

  console.log("\n⚠️  PERFORMING RESET...\n");

  // Perform resets
  if (deleteQuestions) {
    console.log("🗑️  Deleting pattern-generated questions...");
    const deleteResult = await prisma.question.deleteMany({
      where: {
        generatedFromPattern: true,
        ...(source ? { source: "web_scraped" } : {})
      }
    });
    console.log(`   ✅ Deleted ${deleteResult.count} questions`);
  }

  if (resetPatterns) {
    console.log("🔄 Resetting pattern flags...");
    const updateResult = await prisma.algorithmPattern.updateMany({
      where: { ...whereClause, questionsGenerated: true },
      data: { questionsGenerated: false }
    });
    console.log(`   ✅ Reset ${updateResult.count} patterns`);
  }

  console.log("\n✅ Reset complete!");
  console.log("\nYou can now run generation:");
  console.log("   npx ts-node src/scripts/batch-generate-questions.ts");
  
  console.log("\n" + "=".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});