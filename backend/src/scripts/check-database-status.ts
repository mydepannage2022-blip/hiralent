// src/scripts/check-database-status.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking Database Status\n");
  console.log("=".repeat(60));

  // 1. Count patterns
  const totalPatterns = await prisma.algorithmPattern.count();
  const patternsGenerated = await prisma.algorithmPattern.count({
    where: { questionsGenerated: true }
  });
  const patternsNotGenerated = await prisma.algorithmPattern.count({
    where: { questionsGenerated: false }
  });

  console.log("\n📊 PATTERNS STATUS:");
  console.log(`   Total patterns: ${totalPatterns}`);
  console.log(`   ✅ Already generated: ${patternsGenerated}`);
  console.log(`   ⏳ Not yet generated: ${patternsNotGenerated}`);

  // 2. Count questions
  const totalQuestions = await prisma.question.count();
  const patternQuestions = await prisma.question.count({
    where: { generatedFromPattern: true }
  });
  const libraryQuestions = await prisma.question.count({
    where: { generatedFromPattern: false }
  });

  console.log("\n📝 QUESTIONS STATUS:");
  console.log(`   Total questions: ${totalQuestions}`);
  console.log(`   📦 From patterns: ${patternQuestions}`);
  console.log(`   📚 Library (non-pattern): ${libraryQuestions}`);

  // 3. Check pattern keys
  const questionsWithPatternKeys = await prisma.question.count({
    where: {
      patternKey: { not: null }
    }
  });

  console.log("\n🔑 PATTERN KEYS:");
  console.log(`   Questions with patternKey: ${questionsWithPatternKeys}`);

  // 4. Sample check - first 5 patterns
  console.log("\n🔬 SAMPLE CHECK (First 5 Patterns):");
  const samplePatterns = await prisma.algorithmPattern.findMany({
    take: 5,
    orderBy: { extractedAt: 'desc' },
    select: {
      id: true,
      source: true,
      sourceId: true,
      questionsGenerated: true,
    }
  });

  for (const pattern of samplePatterns) {
    const patternKey = `${pattern.source}:${pattern.sourceId}`;
    
    // Check if questions exist for this pattern
    const questionsForPattern = await prisma.question.count({
      where: { patternKey }
    });

    console.log(`\n   Pattern: ${patternKey}`);
    console.log(`      questionsGenerated: ${pattern.questionsGenerated}`);
    console.log(`      Questions in DB: ${questionsForPattern}`);
    
    if (questionsForPattern > 0) {
      // Show the difficulties
      const questions = await prisma.question.findMany({
        where: { patternKey },
        select: { patternDifficultyVariant: true }
      });
      const difficulties = questions.map(q => q.patternDifficultyVariant).join(", ");
      console.log(`      Difficulties: ${difficulties}`);
    }
  }

  // 5. Breakdown by source
  console.log("\n📈 BREAKDOWN BY SOURCE:");
  const sources = await prisma.algorithmPattern.groupBy({
    by: ['source'],
    _count: { id: true }
  });

  for (const src of sources) {
    const generated = await prisma.algorithmPattern.count({
      where: { source: src.source, questionsGenerated: true }
    });
    console.log(`   ${src.source}:`);
    console.log(`      Total: ${src._count.id}`);
    console.log(`      Generated: ${generated}`);
    console.log(`      Remaining: ${src._count.id - generated}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 NEXT STEPS:\n");

  if (patternsNotGenerated === 0) {
    console.log("✅ All patterns have been processed!");
    console.log("\nOptions:");
    console.log("1. If you want to regenerate questions:");
    console.log("   npx ts-node src/scripts/reset-generation-status.ts");
    console.log("\n2. If questions are missing but patterns marked as generated:");
    console.log("   Run the reset script then regenerate");
  } else {
    console.log(`⏳ ${patternsNotGenerated} patterns are ready to generate`);
    console.log("\nRun:");
    console.log("   npx ts-node src/scripts/batch-generate-questions.ts --batch-size 50");
  }

  console.log("\n" + "=".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});