// // src/services/mockQuestionService.ts
// import { Question } from "@prisma/client";
// import prisma from "../lib/prisma"; // <-- FIX THIS PATH

// interface QuestionGenConfig {
//   skills: string[];
//   difficulty: string;
//   totalQuestions: number;
// }

// export async function generateMockQuestionsForAssessment(
//   cfg: QuestionGenConfig
// ): Promise<Question[]> {
//   const mainSkill = cfg.skills[0] ?? "general";

//   const questions: Question[] = [];

//   for (let i = 0; i < cfg.totalQuestions; i++) {
//     const q = await prisma.question.create({
//       data: {
//         title: `Mock ${mainSkill} question #${i + 1}`,
//         description: `Auto-generated ${mainSkill} question`,
//         problemStatement: `Write a function in ${mainSkill} that ... (mock).`,
//         difficulty: cfg.difficulty,
//         skillTags: [mainSkill],
//         type: i % 2 === 0 ? "coding" : "mcq",
//         canonicalSolution: "// TODO: mock solution",
//         testCases: { inputs: [], outputs: [] },
//         status: "approved",
//         createdBy: "mock_wafaa",
//         aiGenerated: true,
//         source: "mock",
//       },
//     });

//     questions.push(q);
//   }

//   return questions;
// }
