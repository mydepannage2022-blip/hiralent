// src/scripts/batch-generate-questions.ts
import prisma from '../lib/prisma';


interface BatchConfig {
  batchSize: number;
  concurrency: number;
  delayBetweenBatches: number;
  difficulties: Array<"easy" | "medium" | "hard">;
  fast: boolean;
  source?: string;
  skipGenerated?: boolean;
}

interface BatchStats {
  totalPatterns: number;
  processedBatches: number;
  totalCreated: number;
  totalSkipped: number;
  totalFailed: number;
  startTime: Date;
  estimatedTimeRemaining: string;
}

class BatchQuestionGenerator {
  private stats: BatchStats = {
    totalPatterns: 0,
    processedBatches: 0,
    totalCreated: 0,
    totalSkipped: 0,
    totalFailed: 0,
    startTime: new Date(),
    estimatedTimeRemaining: "calculating...",
  };

  async run(config: BatchConfig) {
    console.log("🚀 Starting Batch Question Generation");
    console.log("Configuration:", JSON.stringify(config, null, 2));

    // 1) Check if PatternQuestionPipeline exists
    let PatternQuestionPipeline;
    try {
      const module = await import("../services/question/pattern-question.pipeline");
      PatternQuestionPipeline = module.PatternQuestionPipeline;
    } catch (error: any) {
      console.error("\n❌ ERROR: Cannot load PatternQuestionPipeline");
      console.error("Make sure the file exists at: src/services/question/pattern-question.pipeline.ts");
      console.error("Error:", error.message);
      process.exit(1);
    }

    const pipeline = new PatternQuestionPipeline();

    // 2) Count total patterns
    const totalPatterns = await prisma.algorithmPattern.count({
      where: {
        ...(config.source ? { source: config.source } : {}),
        ...(config.skipGenerated ? { questionsGenerated: false } : {}),
      },
    });

    this.stats.totalPatterns = totalPatterns;
    console.log(`\n📊 Total patterns to process: ${totalPatterns}`);

    if (totalPatterns === 0) {
      console.log("✅ No patterns to process!");
      return this.stats;
    }

    const totalBatches = Math.ceil(totalPatterns / config.batchSize);
    console.log(`📦 Will process in ${totalBatches} batches of ${config.batchSize}\n`);

    // 3) Process in batches
    let skip = 0;
    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📦 Processing Batch ${batchNum}/${totalBatches}`);
      console.log(`${"=".repeat(60)}`);

      try {
        const batchStartTime = Date.now();
        
        const result = await pipeline.generateFromPatterns({
          source: config.source,
          limit: config.batchSize,
          difficulties: config.difficulties,
          concurrency: config.concurrency,
          fast: config.fast,
        });

        const batchDuration = Date.now() - batchStartTime;

        this.stats.processedBatches++;
        this.stats.totalCreated += result.created;
        this.stats.totalSkipped += result.skipped;
        this.stats.totalFailed += result.failed;

        const progress = ((this.stats.processedBatches / totalBatches) * 100).toFixed(1);
        const avgBatchTime = (Date.now() - this.stats.startTime.getTime()) / this.stats.processedBatches;
        const remainingBatches = totalBatches - this.stats.processedBatches;
        const etaMs = remainingBatches * avgBatchTime;
        this.stats.estimatedTimeRemaining = this.formatDuration(etaMs);

        console.log(`\n✅ Batch ${batchNum} completed in ${this.formatDuration(batchDuration)}`);
        console.log(`   Created: ${result.created} | Skipped: ${result.skipped} | Failed: ${result.failed}`);
        console.log(`   Patterns marked generated: ${result.patternsMarkedGenerated || 0}`);
        console.log(`\n📈 Overall Progress: ${progress}%`);
        console.log(`   Total Created: ${this.stats.totalCreated}`);
        console.log(`   Total Skipped: ${this.stats.totalSkipped}`);
        console.log(`   Total Failed: ${this.stats.totalFailed}`);
        console.log(`   ETA: ${this.stats.estimatedTimeRemaining}`);

        skip += config.batchSize;

        if (batchNum < totalBatches) {
          console.log(`\n⏳ Waiting ${config.delayBetweenBatches}ms before next batch...`);
          await this.sleep(config.delayBetweenBatches);
        }
      } catch (error: any) {
        console.error(`\n❌ Error in batch ${batchNum}:`, error.message);
        console.log("Continuing to next batch...");
        skip += config.batchSize;
        await this.sleep(config.delayBetweenBatches * 2);
      }
    }

    const totalDuration = Date.now() - this.stats.startTime.getTime();
    console.log(`\n${"=".repeat(60)}`);
    console.log("🎉 BATCH PROCESSING COMPLETE");
    console.log(`${"=".repeat(60)}`);
    console.log(`Total Time: ${this.formatDuration(totalDuration)}`);
    console.log(`Patterns Processed: ${this.stats.totalPatterns}`);
    console.log(`Questions Created: ${this.stats.totalCreated}`);
    console.log(`Questions Skipped: ${this.stats.totalSkipped}`);
    console.log(`Failed: ${this.stats.totalFailed}`);
    console.log(`Success Rate: ${((this.stats.totalCreated / (this.stats.totalCreated + this.stats.totalFailed)) * 100).toFixed(1)}%`);
    console.log(`${"=".repeat(60)}\n`);

    return this.stats;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const config: BatchConfig = {
    batchSize: 50,
    concurrency: 3,
    delayBetweenBatches: 2000,
    difficulties: ["easy", "medium", "hard"],
    fast: true,
    skipGenerated: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--batch-size":
        config.batchSize = parseInt(args[++i]);
        break;
      case "--concurrency":
        config.concurrency = parseInt(args[++i]);
        break;
      case "--delay":
        config.delayBetweenBatches = parseInt(args[++i]);
        break;
      case "--source":
        config.source = args[++i];
        break;
      case "--no-fast":
        config.fast = false;
        break;
      case "--include-generated":
        config.skipGenerated = false;
        break;
      case "--difficulties":
        config.difficulties = args[++i].split(",") as any;
        break;
      case "--help":
        console.log(`
Usage: npx ts-node src/scripts/batch-generate-questions.ts [options]

Options:
  --batch-size <n>          Patterns per batch (default: 50)
  --concurrency <n>         Parallel questions per batch (default: 3)
  --delay <ms>              Delay between batches (default: 2000)
  --source <source>         Filter by source (e.g., stackoverflow)
  --difficulties <list>     Comma-separated list (default: easy,medium,hard)
  --no-fast                 Disable fast mode
  --include-generated       Process patterns even if already generated
  --help                    Show this help

Examples:
  npx ts-node src/scripts/batch-generate-questions.ts
  npx ts-node src/scripts/batch-generate-questions.ts --batch-size 100 --concurrency 5
  npx ts-node src/scripts/batch-generate-questions.ts --source stackoverflow --delay 5000
  npx ts-node src/scripts/batch-generate-questions.ts --difficulties easy,medium
        `);
        process.exit(0);
    }
  }

  const generator = new BatchQuestionGenerator();
  await generator.run(config);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  console.error("\n🔍 Stack trace:", error.stack);
  process.exit(1);
});