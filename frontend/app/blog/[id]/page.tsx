import { notFound } from "next/navigation";
import ArticleClient from "./ArticleClient";

export type ArticleSection = {
  id: string;
  title: string;
  blocks: (
    | { type: "p"; text: string }
    | { type: "h3"; text: string }
    | { type: "callout"; title: string; text: string }
    | { type: "quote"; quote: string; by: string }
    | { type: "code"; title: string; code: string }
    | { type: "figure"; label: string; caption: string; scene?: string }
    | { type: "list"; items: string[] }
  )[];
};

export type Article = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  readTime: string;
  accent: string;
  coverScene: string;
  takeaways: string[];
  sections: ArticleSection[];
  prev: { id: string; title: string; accent: string };
  next: { id: string; title: string; accent: string };
};

const ARTICLES: Record<string, Article> = {
  "1": {
    id: "1",
    title: "How AI Matching Actually Works at Hiralent",
    subtitle:
      "No keyword games. A transparent scoring system based on skills, depth, and real proof.",
    author: "Hiralent Team",
    date: "Feb 2026",
    readTime: "7 min",
    accent: "#005DDC",
    coverScene: "matching-hero",
    takeaways: [
      "We build a structured skill graph (not a bag of keywords).",
      "We score required/optional/impact skills with weights.",
      "We add proof: projects + assessments + recency.",
      "The score is explainable to employers (and candidates).",
    ],
    sections: [
      {
        id: "overview",
        title: "The problem with keyword matching",
        blocks: [
          {
            type: "p",
            text: "Traditional matching is fragile: it rewards keyword stuffing and punishes qualified candidates who simply used different wording. Hiralent treats your profile as structured signal, not plain text.",
          },
          {
            type: "callout",
            title: "What we don't do",
            text: "We don't just search for words like \"React\" in a PDF. We look at depth, scope, recency, and evidence.",
          },
          {
            type: "figure",
            label: "Matching pipeline",
            caption: "Normalize → score → explain → improve.",
            scene: "matching-pipeline",
          },
          {
            type: "list",
            items: [
              "Normalize skills and titles (React/ReactJS/React.js)",
              "Extract context (frontend vs full-stack vs mobile UI)",
              "Score using weighted signals",
              "Explain the score clearly",
            ],
          },
        ],
      },
      {
        id: "skill-graph",
        title: "Step 1 — Structured skill graph",
        blocks: [
          {
            type: "p",
            text: "We convert profiles into a skill graph: tools, frameworks, domains, seniority, and relationships. This prevents \"used Node once\" from looking the same as \"built systems on Node for 3 years.\"",
          },
          {
            type: "figure",
            label: "Skill graph",
            caption: "Nodes are skills; edges store context and confidence.",
            scene: "skill-graph",
          },
          {
            type: "code",
            title: "Simplified scoring skeleton",
            code: `// pseudo-scoring (simplified)
score =
  w_required * coverage(requiredSkills) +
  w_optional * coverage(optionalSkills) +
  w_depth    * depthScore(experience) +
  w_proof    * proofScore(assessments, projects) +
  w_recency  * recencyBoost(recentWork);`,
          },
        ],
      },
      {
        id: "scoring",
        title: "Step 2 — Weighted role scoring",
        blocks: [
          {
            type: "p",
            text: "Jobs include required skills, optional skills, and impact skills (signals that raise confidence). Each category has weights. The output is a score with a breakdown recruiters can trust.",
          },
          {
            type: "callout",
            title: "Impact skills",
            text: "These are signals like architecture, leadership, system design, scale, and business outcomes — not just tools.",
          },
          {
            type: "figure",
            label: "Score breakdown",
            caption: "What helped, what hurt, what to improve.",
            scene: "score-breakdown",
          },
        ],
      },
      {
        id: "transparency",
        title: "Step 3 — Explainability (no black box)",
        blocks: [
          {
            type: "p",
            text: "Matching shouldn't be mysterious. Employers see why a candidate scored 94% instead of 88%, and candidates see what to strengthen next.",
          },
          {
            type: "quote",
            quote: "A good match is not \"React appears in the CV\". It's \"React + depth + scope + evidence + context.\"",
            by: "Hiralent Matching Principles",
          },
          {
            type: "list",
            items: [
              "Skill coverage (required/optional)",
              "Experience depth (years, scope, complexity)",
              "Proof signals (projects, tests)",
              "Confidence (data completeness)",
            ],
          },
        ],
      },
    ],
    prev: { id: "3", title: "What to Expect in a Hiralent Assessment", accent: "#7C3AED" },
    next: { id: "2", title: "Build a Profile That Employers Actually Trust", accent: "#00A35A" },
  },

  "2": {
    id: "2",
    title: "Build a Profile That Employers Actually Trust",
    subtitle: "Turn your CV into a verified, structured profile that signals real competency.",
    author: "Hiralent Team",
    date: "Jan 2026",
    readTime: "6 min",
    accent: "#00A35A",
    coverScene: "profile-hero",
    takeaways: [
      "Structure beats vague bullets every time.",
      "Verification is the fastest trust multiplier.",
      "Impact metrics make your story believable.",
      "A strong profile is scannable and consistent.",
    ],
    sections: [
      {
        id: "cv-vs-profile",
        title: "CV vs Profile: why structure wins",
        blocks: [
          {
            type: "p",
            text: "A CV is a snapshot. A profile is a living signal. Recruiters want clarity: what you did, how well, and with what proof.",
          },
          {
            type: "figure",
            label: "CV → Profile",
            caption: "Unstructured PDFs → structured, searchable signals.",
            scene: "cv-to-profile",
          },
          {
            type: "callout",
            title: "Trust checklist recruiters use",
            text: "Clear scope • measurable impact • consistent timeline • relevant tools • proof",
          },
        ],
      },
      {
        id: "case-study",
        title: "Write experience like a mini case study",
        blocks: [
          {
            type: "p",
            text: "Replace vague statements with context → action → impact. Even two lines can feel premium if they include outcomes and constraints.",
          },
          {
            type: "list",
            items: [
              "Start with scope (team/product/users)",
              "Name tools only when they matter",
              "Add measurable impact (%, ms, revenue, adoption)",
              "End with what you learned or improved",
            ],
          },
          {
            type: "figure",
            label: "Profile sections",
            caption: "Structure makes your story scannable and credible.",
            scene: "profile-sections",
          },
        ],
      },
      {
        id: "verification",
        title: "Verification: the trust shortcut",
        blocks: [
          {
            type: "p",
            text: "Verified skills are a powerful signal. They reduce risk for employers and help candidates stand out without writing longer CVs.",
          },
          {
            type: "quote",
            quote: "A strong profile doesn't say 'I did things'. It proves impact, clarity, and consistency.",
            by: "Hiralent Profile Team",
          },
          {
            type: "callout",
            title: "Proof can be lightweight",
            text: "Assessments, portfolio items, references, certifications, and even well-documented project summaries.",
          },
        ],
      },
    ],
    prev: { id: "1", title: "How AI Matching Actually Works at Hiralent", accent: "#005DDC" },
    next: { id: "3", title: "What to Expect in a Hiralent Assessment", accent: "#7C3AED" },
  },

  "3": {
    id: "3",
    title: "What to Expect in a Hiralent Assessment",
    subtitle: "A real editor, real tests, and feedback that feels like mentorship — not a trap.",
    author: "Hiralent Team",
    date: "Jan 2026",
    readTime: "8 min",
    accent: "#7C3AED",
    coverScene: "assessment-hero",
    takeaways: [
      "You'll write real code and run real tests.",
      "Correctness + edge cases matter most.",
      "Read prompts carefully and keep it clean.",
      "You'll get feedback you can actually use.",
    ],
    sections: [
      {
        id: "format",
        title: "The format (what you'll actually do)",
        blocks: [
          {
            type: "p",
            text: "Assessments are designed like real work: read a prompt, implement, run tests, fix, and submit. The goal is fairness + signal.",
          },
          {
            type: "figure",
            label: "Assessment flow",
            caption: "Prompt → implement → run → fix → submit.",
            scene: "assessment-flow",
          },
          { type: "callout", title: "No trick questions", text: "We optimize for clarity and real skill measurement." },
        ],
      },
      {
        id: "evaluation",
        title: "How evaluation works (and how to win)",
        blocks: [
          {
            type: "p",
            text: "Tests verify correctness and edge cases. Some tasks include performance expectations. Clean code and safe handling can boost outcomes.",
          },
          {
            type: "code",
            title: "Edge case checklist",
            code: `// checklist
- empty inputs
- very large inputs
- duplicates
- negative/invalid values
- time complexity expectations`,
          },
          {
            type: "quote",
            quote: "Assessments should measure real skill, not memorized trivia. We optimize for signal, fairness, and clarity.",
            by: "Hiralent Assessment Team",
          },
        ],
      },
      {
        id: "prep",
        title: "Prep (24 hours before)",
        blocks: [
          {
            type: "p",
            text: "Keep it simple: sleep, practice 1–2 tasks, review your patterns, and focus on clarity. Over-studying usually makes you worse.",
          },
          {
            type: "list",
            items: [
              "Underline inputs/outputs and constraints before coding",
              "Write 2 manual tests before running",
              "Name variables clearly; handle edge cases; avoid hacks",
            ],
          },
          {
            type: "figure",
            label: "Tips",
            caption: "Clarity > cleverness. Robust > fast hacks.",
            scene: "assessment-tips",
          },
        ],
      },
    ],
    prev: { id: "2", title: "Build a Profile That Employers Actually Trust", accent: "#00A35A" },
    next: { id: "1", title: "How AI Matching Actually Works at Hiralent", accent: "#005DDC" },
  },
};

export default function Page({ params }: { params: { id: string } }) {
  const article = ARTICLES[params.id];
  if (!article) return notFound();
  return <ArticleClient article={article} />;
}