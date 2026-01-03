// src/scripts/export-to-git-repo.ts
/**
 * Exports library questions to a Git repository format
 * Organizes questions by category and difficulty for easy browsing
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Exporting Library Questions to Git Format\n");
  console.log("=".repeat(60));

  const exportDir = path.join(process.cwd(), "library-export");
  
  // Create directory structure
  if (fs.existsSync(exportDir)) {
    fs.rmSync(exportDir, { recursive: true });
  }
  fs.mkdirSync(exportDir, { recursive: true });

  // 1. Get all library questions
  const libraryQuestions = await prisma.question.findMany({
    where: {
      OR: [
        { source: "library_ai_coding" },
        { source: "library_ai_mcq" },
        { source: "web_scraped" },
        { isLibraryQuestion: true },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n📊 Found ${libraryQuestions.length} library questions\n`);

  // 2. Organize by category
  const byCategory: Record<string, any[]> = {};
  
  for (const q of libraryQuestions) {
    // Extract categories from skillTags
    const categories = q.skillTags
      .filter((tag) => tag.startsWith("category:"))
      .map((tag) => tag.replace("category:", ""));
    
    const category = categories[0] || "general";
    
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    
    byCategory[category].push({
      id: q.id,
      title: q.title,
      description: q.description,
      problemStatement: q.problemStatement,
      difficulty: q.difficulty,
      skillTags: q.skillTags,
      type: q.type,
      canonicalSolution: q.canonicalSolution,
      testCases: q.testCases,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      source: q.source,
      patternKey: q.patternKey,
    });
  }

  console.log("📂 Creating directory structure...\n");

  // 3. Create files organized by category and difficulty
  for (const [category, questions] of Object.entries(byCategory)) {
    const categoryDir = path.join(exportDir, category);
    fs.mkdirSync(categoryDir, { recursive: true });

    // Group by difficulty
    const byDifficulty: Record<string, any[]> = {
      easy: [],
      medium: [],
      hard: [],
    };

    questions.forEach((q) => {
      const diff = q.difficulty.toLowerCase();
      if (byDifficulty[diff]) {
        byDifficulty[diff].push(q);
      }
    });

    // Save each difficulty as separate file
    for (const [difficulty, qs] of Object.entries(byDifficulty)) {
      if (qs.length === 0) continue;
      
      const filePath = path.join(categoryDir, `${difficulty}.json`);
      fs.writeFileSync(filePath, JSON.stringify(qs, null, 2));
      console.log(`   ✅ ${category}/${difficulty}.json (${qs.length} questions)`);
    }

    // Create category summary
    const summaryPath = path.join(categoryDir, "README.md");
    const summaryContent = `# ${category.toUpperCase()} Questions

Total: ${questions.length} questions

## Breakdown by Difficulty

- **Easy**: ${byDifficulty.easy.length} questions
- **Medium**: ${byDifficulty.medium.length} questions  
- **Hard**: ${byDifficulty.hard.length} questions

## Files

- \`easy.json\` - Easy difficulty questions
- \`medium.json\` - Medium difficulty questions
- \`hard.json\` - Hard difficulty questions

## Sample Questions

${questions.slice(0, 5).map((q) => `- **${q.title}** (${q.difficulty})`).join("\n")}

${questions.length > 5 ? `\n... and ${questions.length - 5} more` : ""}
`;
    fs.writeFileSync(summaryPath, summaryContent);
  }

  // 4. Create main README
  const mainReadmePath = path.join(exportDir, "README.md");
  const mainReadmeContent = `# HirAlent Library Questions

**Generated:** ${new Date().toISOString()}
**Total Questions:** ${libraryQuestions.length}

## Categories

${Object.entries(byCategory)
  .map(
    ([cat, qs]) =>
      `- **${cat}**: ${qs.length} questions (${
        qs.filter((q) => q.difficulty === "easy").length
      } easy, ${qs.filter((q) => q.difficulty === "medium").length} medium, ${
        qs.filter((q) => q.difficulty === "hard").length
      } hard)`
  )
  .join("\n")}

## Structure

\`\`\`
library-export/
├── README.md (this file)
├── dsa/
│   ├── README.md
│   ├── easy.json
│   ├── medium.json
│   └── hard.json
├── web-dev/
│   ├── README.md
│   ├── easy.json
│   ├── medium.json
│   └── hard.json
└── ... (other categories)
\`\`\`

## How to Use

### Import All Questions

\`\`\`typescript
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function importLibrary() {
  const categories = fs.readdirSync("library-export", { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const category of categories) {
    const categoryPath = path.join("library-export", category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      const questions = JSON.parse(
        fs.readFileSync(path.join(categoryPath, file), "utf-8")
      );
      
      for (const q of questions) {
        await prisma.question.create({ data: q });
      }
    }
  }
}
\`\`\`

### Import Specific Category

\`\`\`typescript
const dsaEasy = JSON.parse(
  fs.readFileSync("library-export/dsa/easy.json", "utf-8")
);

for (const q of dsaEasy) {
  await prisma.question.create({ data: q });
}
\`\`\`

## Distribution

You can:
1. Commit this directory to Git
2. Share as a ZIP file
3. Host on a file server
4. Create an npm package

## License

[Your License Here]
`;

  fs.writeFileSync(mainReadmePath, mainReadmeContent);

  // 5. Create package.json for npm distribution (optional)
  const packageJsonPath = path.join(exportDir, "package.json");
  const packageJson = {
    name: "@hiralent/question-library",
    version: "1.0.0",
    description: "HirAlent Question Library - Curated technical interview questions",
    main: "index.js",
    keywords: ["interview", "questions", "coding", "dsa", "algorithms"],
    author: "HirAlent Team",
    license: "MIT",
    files: ["**/easy.json", "**/medium.json", "**/hard.json", "README.md"],
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Export Complete!\n");
  console.log(`📁 Export directory: ${exportDir}`);
  console.log("\n📦 Distribution options:");
  console.log("   1. Git: Create a repo and push the library-export folder");
  console.log("   2. ZIP: Compress library-export and share");
  console.log("   3. NPM: Publish as npm package (optional)");
  console.log("\n=".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});