// src/scripts/export-library-questions.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Exporting Library Questions\n");
  console.log("=".repeat(60));

  // 1. Get all library questions (seed + pattern-generated)
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

  // 2. Breakdown by source
  const breakdown = libraryQuestions.reduce((acc, q) => {
    acc[q.source || "unknown"] = (acc[q.source || "unknown"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("📈 Breakdown by source:");
  Object.entries(breakdown).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });

  // 3. Export as JSON
  const exportDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const jsonFilePath = path.join(exportDir, `library-questions-${timestamp}.json`);

  // Remove sensitive fields before export
  const exportData = libraryQuestions.map((q) => ({
    ...q,
    createdBy: "system", // Anonymize creator
  }));

  fs.writeFileSync(jsonFilePath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Exported to: ${jsonFilePath}`);

  // 4. Create SQL INSERT statements
  const sqlFilePath = path.join(exportDir, `library-questions-${timestamp}.sql`);
  let sqlContent = `-- HirAlent Library Questions Export
-- Generated: ${new Date().toISOString()}
-- Total Questions: ${libraryQuestions.length}
-- 
-- Instructions:
-- 1. Import this file into your PostgreSQL database
-- 2. Run: psql -d your_database -f ${path.basename(sqlFilePath)}
--

BEGIN;

`;

  for (const q of exportData) {
    const values = [
      `'${q.id}'`,
      `'${q.title.replace(/'/g, "''")}'`,
      `'${q.description.replace(/'/g, "''")}'`,
      `'${q.problemStatement.replace(/'/g, "''")}'`,
      `'${q.difficulty}'`,
      `ARRAY[${q.skillTags.map((t) => `'${t.replace(/'/g, "''")}'`).join(", ")}]`,
      `'${q.type}'`,
      `'${q.canonicalSolution.replace(/'/g, "''")}'`,
      `'${JSON.stringify(q.testCases).replace(/'/g, "''")}'`,
      q.options ? `'${JSON.stringify(q.options).replace(/'/g, "''")}'` : "NULL",
      q.correctAnswer ? `'${q.correctAnswer.replace(/'/g, "''")}'` : "NULL",
      `'${(q.explanation || "").replace(/'/g, "''")}'`,
      `'${q.status}'`,
      q.createdBy ? `'${q.createdBy}'` : "NULL",
      q.aiGenerated ? "TRUE" : "FALSE",
      q.source ? `'${q.source}'` : "NULL",
      `'${q.createdAt.toISOString()}'`,
      `'${q.updatedAt.toISOString()}'`,
      q.isLibraryQuestion ? "TRUE" : "FALSE",
      q.generatedFromPattern ? "TRUE" : "FALSE",
      q.patternKey ? `'${q.patternKey}'` : "NULL",
      q.patternDifficultyVariant ? `'${q.patternDifficultyVariant}'` : "NULL",
      q.vectorStored ? "TRUE" : "FALSE",
      q.vectorId ? `'${q.vectorId}'` : "NULL",
      q.metadata ? `'${JSON.stringify(q.metadata).replace(/'/g, "''")}'` : "NULL",
    ];

    sqlContent += `INSERT INTO questions (
  id, title, description, "problemStatement", difficulty, "skillTags", type,
  "canonicalSolution", "testCases", options, "correctAnswer", explanation,
  status, "createdBy", "aiGenerated", source, "createdAt", "updatedAt",
  "isLibraryQuestion", "generatedFromPattern", "patternKey", "patternDifficultyVariant",
  "vectorStored", "vectorId", metadata
) VALUES (
  ${values.join(", ")}
) ON CONFLICT (id) DO NOTHING;

`;
  }

  sqlContent += `COMMIT;

-- Summary:
-- Total questions: ${libraryQuestions.length}
-- Sources: ${Object.keys(breakdown).join(", ")}
`;

  fs.writeFileSync(sqlFilePath, sqlContent);
  console.log(`✅ SQL export: ${sqlFilePath}`);

  // 5. Create import instructions
  const readmePath = path.join(exportDir, `README-${timestamp}.md`);
  const readmeContent = `# Library Questions Export

**Generated:** ${new Date().toISOString()}
**Total Questions:** ${libraryQuestions.length}

## Breakdown by Source

${Object.entries(breakdown)
  .map(([source, count]) => `- **${source}**: ${count} questions`)
  .join("\n")}

## Files Included

1. \`library-questions-${timestamp}.json\` - JSON format (${(
    fs.statSync(jsonFilePath).size /
    1024 /
    1024
  ).toFixed(2)} MB)
2. \`library-questions-${timestamp}.sql\` - SQL format (${(
    fs.statSync(sqlFilePath).size /
    1024 /
    1024
  ).toFixed(2)} MB)

## How to Import

### Option 1: Using PostgreSQL (SQL file)

\`\`\`bash
psql -d your_database -f library-questions-${timestamp}.sql
\`\`\`

### Option 2: Using Prisma (JSON file)

\`\`\`typescript
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const questions = JSON.parse(fs.readFileSync("library-questions-${timestamp}.json", "utf-8"));

for (const q of questions) {
  await prisma.question.create({ data: q });
}
\`\`\`

### Option 3: Manual Import via API

Upload the JSON file and use your API endpoint to bulk create questions.

## Notes

- All questions have \`isLibraryQuestion = true\`
- User IDs are anonymized to "system"
- Questions include proper categorization with \`category:*\` tags
- Vector embeddings may need to be regenerated after import
`;

  fs.writeFileSync(readmePath, readmeContent);
  console.log(`✅ README: ${readmePath}`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Export Complete!\n");
  console.log(`📁 Export directory: ${exportDir}`);
  console.log("\n💡 Share these files with your team:");
  console.log(`   1. library-questions-${timestamp}.json (for programmatic import)`);
  console.log(`   2. library-questions-${timestamp}.sql (for direct PostgreSQL import)`);
  console.log(`   3. README-${timestamp}.md (instructions)`);
  console.log("\n=".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});