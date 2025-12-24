// lib/libraryCategories.ts
import type { LibraryQuestion } from './api/libraryQuestions';

export const LIBRARY_CATEGORIES = [
  { id: 'all', label: 'All topics' },

  // Code / CS
  { id: 'dsa',       label: 'Data Structures & Algorithms' },
  { id: 'frontend',  label: 'Frontend (JS / React / CSS)' },
  { id: 'backend',   label: 'Backend & APIs' },
  { id: 'python',    label: 'Python & Data' },
  { id: 'db',        label: 'Databases & SQL' },
  { id: 'devops',    label: 'DevOps / Git / Docker' },

  // Non purely code
  { id: 'math',      label: 'Math & Statistics' },
  { id: 'business',  label: 'Business / Agile / Finance' },

  { id: 'other',     label: 'Other' },
] as const;

export type LibraryCategoryId = (typeof LIBRARY_CATEGORIES)[number]['id'];

export function getCategoryForQuestion(q: LibraryQuestion): LibraryCategoryId {
  const title = q.title.toLowerCase();
  const tags = (q.skillTags || []).map(t => t.toLowerCase());
  const text = title + ' ' + tags.join(' ');

  const has = (word: string) => text.includes(word);

  if (['array', 'linked list', 'tree', 'graph', 'sorting', 'dp', 'dynamic programming', 'two pointers', 'sliding window']
    .some(w => has(w))) return 'dsa';

  if (['javascript', 'typescript', 'react', 'next.js', 'vue', 'frontend', 'css', 'html', 'dom']
    .some(has)) return 'frontend';

  if (['node', 'express', 'spring', 'rest', 'api', 'microservice', 'jwt']
    .some(has)) return 'backend';

  if (['python', 'pandas', 'numpy', 'django', 'flask', 'notebook']
    .some(has)) return 'python';

  if (['sql', 'join', 'index', 'postgres', 'mongodb', 'database']
    .some(has)) return 'db';

  if (['docker', 'kubernetes', 'git', 'ci/cd', 'pipeline', 'nginx']
    .some(has)) return 'devops';

  if (['probability', 'statistics', 'regression', 'variance', 'bayes']
    .some(has)) return 'math';

  if (['agile', 'scrum', 'marketing', 'finance', 'accounting', 'business']
    .some(has)) return 'business';

  return 'other';
}

export function groupByCategory(questions: LibraryQuestion[]) {
  const grouped: Record<LibraryCategoryId, LibraryQuestion[]> = {
    all: [],
    dsa: [],
    frontend: [],
    backend: [],
    python: [],
    db: [],
    devops: [],
    math: [],
    business: [],
    other: [],
  };

  for (const q of questions) {
    grouped.all.push(q);
    const cat = getCategoryForQuestion(q);
    grouped[cat].push(q);
  }

  return grouped;
}
