/**
 * Seed: Assessment Diagram Test
 *
 * Creates a ready-to-use CandidateAssessmentSession with 7 questions
 * (mix of coding + MCQ, several with real diagram images) so you can
 * test the diagram viewer inside HiralentRunner without any workers.
 *
 * Run:
 *   cd backend
 *   npx tsx prisma/seeds/assessment-diagram-test.seed.ts
 *
 * At the end it prints the URL you can open directly in the browser.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Fixed IDs (idempotent re-runs) ──────────────────────────────────────────
const IDS = {
  companyUser:   "seed-diag-company-user-001",
  candidateUser: "seed-diag-candidate-user-001",
  job:           "seed-diag-job-001",
  assessment:    "seed-diag-assessment-001",
  // Questions
  q1: "seed-diag-q-001",  // coding — no diagram
  q2: "seed-diag-q-002",  // MCQ    — no diagram
  q3: "seed-diag-q-003",  // coding — Binary Tree diagram
  q4: "seed-diag-q-004",  // coding — Linked List diagram
  q5: "seed-diag-q-005",  // coding — Graph (BFS/DFS) diagram
  q6: "seed-diag-q-006",  // MCQ    — Binary Search Tree diagram
  q7: "seed-diag-q-007",  // coding — Stack diagram
  session: "seed-diag-session-001",
};

const SEED_PASSWORD = "SeedPass@1";

// ─── Public domain diagram images (Wikipedia Commons SVGs) ───────────────────
const DIAGRAMS = {
  binaryTree:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Binary_tree.svg/1200px-Binary_tree.svg.png",
  bst:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Binary_search_tree.svg/1200px-Binary_search_tree.svg.png",
  linkedList:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Singly-linked-list.svg/1200px-Singly-linked-list.svg.png",
  graph:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/6n-graf.svg/1200px-6n-graf.svg.png",
  stack:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lifo_stack.svg/1200px-Lifo_stack.svg.png",
};

async function main() {
  console.log("🌱  Starting assessment-diagram-test seeder…\n");

  const SEED_HASH = await bcrypt.hash(SEED_PASSWORD, 10);

  // ── 1. Company user + profile + job ────────────────────────────────────────
  await prisma.user.upsert({
    where:  { user_id: IDS.companyUser },
    create: {
      user_id: IDS.companyUser, email: "seed.diag.company@hiralent.dev",
      password_hash: SEED_HASH, full_name: "Diagram Test Company",
      role: "company_admin", is_email_verified: true,
    },
    update: { password_hash: SEED_HASH },
  });

  await prisma.companyProfile.upsert({
    where:  { company_id: IDS.companyUser },
    create: { company_id: IDS.companyUser, company_name: "Diagram Test Inc.", display_name: "DiagTest", industry: "Technology" },
    update: {},
  });

  await prisma.companyJob.upsert({
    where:  { job_id: IDS.job },
    create: {
      job_id: IDS.job, company_id: IDS.companyUser,
      title: "Test Engineer", location: "Remote",
      description: "Seeded job for diagram runner tests.",
      required_skills: ["JavaScript", "Algorithms", "Data Structures"],
      status: "ACTIVE",
    },
    update: {},
  });

  // ── 2. Candidate user + profile ─────────────────────────────────────────────
  await prisma.user.upsert({
    where:  { user_id: IDS.candidateUser },
    create: {
      user_id: IDS.candidateUser, email: "seed.diag.candidate@hiralent.dev",
      password_hash: SEED_HASH, full_name: "Diagram Test Candidate",
      role: "candidate", is_email_verified: true,
    },
    update: { password_hash: SEED_HASH },
  });

  await prisma.candidateProfile.upsert({
    where:  { candidate_id: IDS.candidateUser },
    create: { candidate_id: IDS.candidateUser, skills: ["JavaScript", "Algorithms", "Data Structures"] },
    update: {},
  });

  console.log("✅  Users ready.");

  // ── 3. Questions ─────────────────────────────────────────────────────────────

  // Q1 — plain coding, no diagram
  await prisma.question.upsert({
    where: { id: IDS.q1 },
    create: {
      id: IDS.q1,
      title: "Two Sum",
      description: "Classic hash-map problem.",
      problemStatement:
        "Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.",
      difficulty: "easy", skillTags: ["arrays", "hash-map"], type: "coding",
      canonicalSolution:
        "function twoSum(nums, target) {\n  const map = {};\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (comp in map) return [map[comp], i];\n    map[nums[i]] = i;\n  }\n}",
      testCases: { inputs: ["[2,7,11,15]\n9", "[3,2,4]\n6"], outputs: ["[0,1]", "[1,2]"] },
      status: "approved", isLibraryQuestion: true,
    },
    update: {},
  });

  // Q2 — plain MCQ, no diagram
  await prisma.question.upsert({
    where: { id: IDS.q2 },
    create: {
      id: IDS.q2,
      title: "Time Complexity of Binary Search",
      description: "Complexity analysis.",
      problemStatement: "What is the **average-case** time complexity of binary search on a sorted array of `n` elements?",
      difficulty: "easy", skillTags: ["algorithms", "complexity"], type: "mcq",
      canonicalSolution: "O(log n)",
      testCases: {},
      options: [
        { id: "a", text: "O(1)" }, { id: "b", text: "O(log n)" },
        { id: "c", text: "O(n)" }, { id: "d", text: "O(n log n)" },
      ],
      correctAnswer: "b",
      explanation: "Binary search halves the search space on each step, giving O(log n).",
      status: "approved", isLibraryQuestion: true,
    },
    update: {},
  });

  // Q3 — Binary Tree Inorder Traversal + diagram
  await prisma.question.upsert({
    where: { id: IDS.q3 },
    create: {
      id: IDS.q3,
      title: "Binary Tree — Inorder Traversal",
      description: "Tree traversal.",
      problemStatement:
        "Given the `root` of a **binary tree** (see diagram), return its **inorder traversal** as an array.\n\n**Example:**\n- Input: `root = [1, null, 2, 3]`\n- Output: `[1, 3, 2]`\n\nThe diagram shows the tree structure. Use it to trace the traversal order before coding.",
      difficulty: "easy", skillTags: ["trees", "recursion", "dfs"], type: "coding",
      canonicalSolution:
        "function inorderTraversal(root) {\n  const res = [];\n  const dfs = (node) => {\n    if (!node) return;\n    dfs(node.left);\n    res.push(node.val);\n    dfs(node.right);\n  };\n  dfs(root);\n  return res;\n}",
      testCases: { inputs: ["[1,null,2,3]", "[3,1,2]"], outputs: ["[1,3,2]", "[1,3,2]"] },
      status: "approved", isLibraryQuestion: true,
      hasDiagram: true, diagramType: "tree",
      diagramImageUrl: DIAGRAMS.binaryTree,
      diagramCode: "graph TD\n  A[1] --> B[null]\n  A --> C[2]\n  C --> D[3]\n  C --> E[null]",
    },
    update: { hasDiagram: true, diagramType: "tree", diagramImageUrl: DIAGRAMS.binaryTree,
      diagramCode: "graph TD\n  A[1] --> B[null]\n  A --> C[2]\n  C --> D[3]\n  C --> E[null]" },
  });

  // Q4 — Reverse a Linked List + diagram
  await prisma.question.upsert({
    where: { id: IDS.q4 },
    create: {
      id: IDS.q4,
      title: "Reverse a Linked List",
      description: "Linked list pointer manipulation.",
      problemStatement:
        "Given the `head` of a **singly linked list** (see diagram), reverse the list and return the reversed list's head.\n\n**Example:**\n- Input: `head = [1 → 2 → 3 → 4 → 5]`\n- Output: `[5 → 4 → 3 → 2 → 1]`\n\nStudy the diagram to understand the node structure before writing the pointer reversal logic.",
      difficulty: "easy", skillTags: ["linked-list", "pointers"], type: "coding",
      canonicalSolution:
        "function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}",
      testCases: { inputs: ["[1,2,3,4,5]", "[1,2]"], outputs: ["[5,4,3,2,1]", "[2,1]"] },
      status: "approved", isLibraryQuestion: true,
      hasDiagram: true, diagramType: "linked-list",
      diagramImageUrl: DIAGRAMS.linkedList,
      diagramCode:
        "graph LR\n  A[1] --> B[2] --> C[3] --> D[4] --> E[5] --> F[null]\n  style A fill:#1B73E8,color:#fff\n  style E fill:#00D4FF,color:#000",
    },
    update: { hasDiagram: true, diagramType: "linked-list", diagramImageUrl: DIAGRAMS.linkedList,
      diagramCode: "graph LR\n  A[1] --> B[2] --> C[3] --> D[4] --> E[5] --> F[null]" },
  });

  // Q5 — Number of Islands (Graph BFS/DFS) + diagram
  await prisma.question.upsert({
    where: { id: IDS.q5 },
    create: {
      id: IDS.q5,
      title: "Number of Islands",
      description: "Graph BFS/DFS on a 2D grid.",
      problemStatement:
        "Given an `m x n` 2D binary grid where `'1'` = land and `'0'` = water, return the **number of islands**.\n\nAn island is surrounded by water and is formed by connecting adjacent lands **horizontally or vertically**.\n\n**Example:**\n```\nInput:\n  1 1 0 0 0\n  1 1 0 0 0\n  0 0 1 0 0\n  0 0 0 1 1\nOutput: 3\n```\n\nThe diagram shows a sample undirected graph — use the same DFS/BFS idea to traverse connected land cells.",
      difficulty: "medium", skillTags: ["graphs", "bfs", "dfs", "grid"], type: "coding",
      canonicalSolution:
        "function numIslands(grid) {\n  let count = 0;\n  const dfs = (r, c) => {\n    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;\n    grid[r][c] = '0';\n    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);\n  };\n  for (let r = 0; r < grid.length; r++)\n    for (let c = 0; c < grid[0].length; c++)\n      if (grid[r][c] === '1') { count++; dfs(r,c); }\n  return count;\n}",
      testCases: {
        inputs: ['[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]'],
        outputs: ["3"],
      },
      status: "approved", isLibraryQuestion: true,
      hasDiagram: true, diagramType: "graph",
      diagramImageUrl: DIAGRAMS.graph,
      diagramCode:
        "graph TD\n  1 --- 2\n  1 --- 5\n  2 --- 5\n  2 --- 3\n  3 --- 4\n  4 --- 6",
    },
    update: { hasDiagram: true, diagramType: "graph", diagramImageUrl: DIAGRAMS.graph,
      diagramCode: "graph TD\n  1 --- 2\n  1 --- 5\n  2 --- 5\n  2 --- 3\n  3 --- 4\n  4 --- 6" },
  });

  // Q6 — BST search MCQ + diagram
  await prisma.question.upsert({
    where: { id: IDS.q6 },
    create: {
      id: IDS.q6,
      title: "Binary Search Tree — Search Result",
      description: "BST traversal MCQ.",
      problemStatement:
        "Look at the **Binary Search Tree** in the diagram.\n\nIf you search for the value `6`, which nodes will be visited (in order) before finding it?",
      difficulty: "easy", skillTags: ["trees", "bst"], type: "mcq",
      canonicalSolution: "c",
      testCases: {},
      options: [
        { id: "a", text: "8 → 3 → 1 → 6" },
        { id: "b", text: "8 → 6" },
        { id: "c", text: "8 → 3 → 6" },
        { id: "d", text: "3 → 6" },
      ],
      correctAnswer: "c",
      explanation:
        "Starting at root 8: 6 < 8 → go left to 3. 6 > 3 → go right to 6. Found. Path: 8 → 3 → 6.",
      status: "approved", isLibraryQuestion: true,
      hasDiagram: true, diagramType: "tree",
      diagramImageUrl: DIAGRAMS.bst,
      diagramCode:
        "graph TD\n  8 --> 3\n  8 --> 10\n  3 --> 1\n  3 --> 6\n  6 --> 4\n  6 --> 7\n  10 --> 14\n  14 --> 13",
    },
    update: { hasDiagram: true, diagramType: "tree", diagramImageUrl: DIAGRAMS.bst,
      diagramCode: "graph TD\n  8-->3\n  8-->10\n  3-->1\n  3-->6\n  6-->4\n  6-->7\n  10-->14\n  14-->13" },
  });

  // Q7 — Valid Parentheses (Stack) + diagram
  await prisma.question.upsert({
    where: { id: IDS.q7 },
    create: {
      id: IDS.q7,
      title: "Valid Parentheses",
      description: "Stack-based bracket matching.",
      problemStatement:
        "Given a string `s` containing only `(`, `)`, `{`, `}`, `[`, `]`, determine if the input is **valid**.\n\nA string is valid if:\n- Open brackets are closed by the **same type** of bracket\n- Open brackets are closed in the **correct order**\n\nThe diagram illustrates how a **stack** processes the string `\"({[]})\"` — use the same idea in your solution.\n\n**Examples:**\n- `\"()\"` → `true`\n- `\"()[]{}\"` → `true`\n- `\"(]\"` → `false`",
      difficulty: "easy", skillTags: ["stack", "strings"], type: "coding",
      canonicalSolution:
        "function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (const c of s) {\n    if ('({['.includes(c)) { stack.push(c); }\n    else if (stack.pop() !== map[c]) return false;\n  }\n  return stack.length === 0;\n}",
      testCases: { inputs: ["\"()\"", "\"()[]{}\"", "\"(]\""], outputs: ["true", "true", "false"] },
      status: "approved", isLibraryQuestion: true,
      hasDiagram: true, diagramType: "stack",
      diagramImageUrl: DIAGRAMS.stack,
      diagramCode:
        "graph TD\n  A[Push '('] --> B[Push '{']\n  B --> C[Push '[']\n  C --> D[Pop '[' matches ']']\n  D --> E[Pop '{' matches '}']\n  E --> F[Pop '(' matches ')']\n  F --> G[Stack empty → VALID]",
    },
    update: { hasDiagram: true, diagramType: "stack", diagramImageUrl: DIAGRAMS.stack,
      diagramCode: "graph TD\n  A[Push '('] --> B[Push '{']\n  B --> C[Push '[']\n  C --> D[Pop '[' ✓]\n  D --> E[Pop '{' ✓]\n  E --> F[Pop '(' ✓]\n  F --> G[VALID]" },
  });

  console.log("✅  7 questions ready (5 with diagrams).");

  // ── 4. EmployerAssessment ────────────────────────────────────────────────────
  const questionIds = [IDS.q1, IDS.q2, IDS.q3, IDS.q4, IDS.q5, IDS.q6, IDS.q7];

  await prisma.employerAssessment.upsert({
    where:  { assessment_id: IDS.assessment },
    create: {
      assessment_id:   IDS.assessment,
      company_id:      IDS.companyUser,
      job_id:          IDS.job,
      title:           "[SEED] Diagram Viewer Test Assessment",
      description:     "7 questions — 5 with diagrams. Created by seeder to test HiralentRunner.",
      status:          "ACTIVE",
      assessment_type: "COMPANY_SPECIFIC",
      skill_category:  "Algorithms",
      difficulty:      "BEGINNER",
      time_limit:      60,
      total_questions: 7,
      passing_score:   70,
      creation_method: "MANUAL",
      question_ids:    questionIds,
    },
    update: { status: "ACTIVE", question_ids: questionIds, total_questions: 7 },
  });

  // ── 5. AssessmentQuestion join records ───────────────────────────────────────
  for (const [idx, question_id] of questionIds.entries()) {
    await prisma.assessmentQuestion.upsert({
      where: { assessment_id_question_id: { assessment_id: IDS.assessment, question_id } },
      create: { assessment_id: IDS.assessment, question_id, order: idx, points: 1 },
      update: { order: idx },
    });
  }

  console.log("✅  AssessmentQuestion links ready.");

  // ── 6. Session (bypass invite — direct Prisma insert) ───────────────────────
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  await prisma.candidateAssessmentSession.upsert({
    where:  { session_id: IDS.session },
    create: {
      session_id:       IDS.session,
      assessment_id:    IDS.assessment,
      candidate_id:     IDS.candidateUser,
      status:           "IN_PROGRESS",
      started_at:       now,
      last_activity_at: now,
      expires_at:       expiresAt,
      time_limit_min:   60,
      current_index:    0,
      flagged:          [],
    },
    update: {
      status:           "IN_PROGRESS",
      started_at:       now,
      last_activity_at: now,
      expires_at:       expiresAt,
      submitted_at:     null,
    },
  });

  // ── 7. Result ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(62));
  console.log("🎯  Open in browser:");
  console.log(`\n    http://localhost:3000/assessment/session/${IDS.session}\n`);
  console.log("    Candidate login:");
  console.log("    Email:    seed.diag.candidate@hiralent.dev");
  console.log("    Password: SeedPass@1");
  console.log("\n    Questions with diagrams: Q3 Q4 Q5 Q6 Q7");
  console.log("    ┌─────────────────────────────────────────┐");
  console.log("    │  Q1  Two Sum              (no diagram)  │");
  console.log("    │  Q2  Binary Search TC     (no diagram)  │");
  console.log("    │  Q3  Binary Tree Inorder  🖼  tree       │");
  console.log("    │  Q4  Reverse Linked List  🖼  linked-list│");
  console.log("    │  Q5  Number of Islands    🖼  graph      │");
  console.log("    │  Q6  BST Search (MCQ)     🖼  tree       │");
  console.log("    │  Q7  Valid Parentheses    🖼  stack      │");
  console.log("    └─────────────────────────────────────────┘");
  console.log("─".repeat(62) + "\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
