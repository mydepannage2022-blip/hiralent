// scripts/seedQuestionLibrary.ts
import 'dotenv/config';
import fetch from 'node-fetch';
import { QuestionService } from '../src/services/question/Question.service';
import { vectorEngineService } from '../src/services/question/vectorEngine.service';
import { aiQuestionGenerationService } from '../src/services/ai/ai-question-generation.service';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

type Difficulty = 'easy' | 'medium' | 'hard';

const questionService = new QuestionService();

/* =====================================
   GROSSE LIBRAIRIE DE TOPICS CODING
===================================== */
const CODING_TOPICS: string[] = [
  // JavaScript / TypeScript
  'JavaScript arrays',
  'JavaScript objects',
  'JavaScript functions',
  'JavaScript closures',
  'JavaScript promises',
  'JavaScript async/await',
  'JavaScript error handling',
  'JavaScript DOM manipulation',
  'JavaScript event handling',
  'JavaScript modules',
  'TypeScript types and interfaces',
  'TypeScript generics',
  'TypeScript classes',

  // Frontend frameworks
  'React components',
  'React hooks',
  'React state management',
  'React context API',
  'React forms handling',
  'React performance optimization',
  'Next.js data fetching',
  'Next.js routing',
  'Vue.js components',
  'Vue.js reactivity system',
  'Vue.js Vuex store',

  // Node / Backend JS
  'Node.js streams',
  'Node.js event loop',
  'Express middleware',
  'REST API design',
  'Authentication in Node.js',
  'Authorization in Node.js',
  'Error handling in Express',

  // Python basics
  'Python lists',
  'Python tuples',
  'Python dictionaries',
  'Python sets',
  'Python functions',
  'Python classes and OOP',
  'Python decorators',
  'Python generators',
  'Python file handling',
  'Python exceptions',
  'Python context managers',
  'Python regex usage',

  // Python frameworks / data
  'Django views and URLs',
  'Django models and ORM',
  'Django forms and validation',
  'Flask routes and blueprints',
  'Flask request handling',
  'Pandas dataframes',
  'Pandas groupby operations',
  'NumPy arrays',
  'NumPy broadcasting',
  'Matplotlib basics in Python',

  // Java
  'Java arrays',
  'Java collections framework',
  'Java ArrayList vs LinkedList',
  'Java HashMap usage',
  'Java streams API',
  'Java multithreading basics',
  'Java synchronization',
  'Java exceptions',
  'Java OOP basics',
  'Java interfaces and abstract classes',
  'Java design patterns (Singleton, Factory)',

  // Spring Boot
  'Spring Boot controllers',
  'Spring Boot dependency injection',
  'Spring Boot REST API',
  'Spring Boot validation',
  'Spring Data JPA repositories',

  // Data structures & algorithms
  'Arrays implementation',
  'Linked lists implementation',
  'Stacks implementation',
  'Queues implementation',
  'Priority queues / heaps',
  'Binary search trees',
  'Balanced binary trees',
  'Graphs representation',
  'Depth-first search',
  'Breadth-first search',
  'Binary search algorithm',
  'Merge sort algorithm',
  'Quick sort algorithm',
  'Dynamic programming basics',
  'Greedy algorithms basics',
  'Backtracking algorithms',
  'Sliding window technique',
  'Two pointers technique',

  // Databases / SQL
  'SQL SELECT queries',
  'SQL JOIN operations',
  'SQL aggregations and GROUP BY',
  'SQL subqueries',
  'SQL indexes and performance',
  'Database normalization',
  'Transactions and ACID properties',
  'PostgreSQL indexing',
  'MongoDB basic queries',
  'MongoDB aggregation pipeline',

  // Web / HTTP
  'HTTP methods and status codes',
  'REST API best practices',
  'GraphQL basics',
  'Authentication with JWT',
  'Sessions vs tokens authentication',
  'CORS and preflight requests',
  'Rate limiting in APIs',

  // HTML / CSS
  'HTML semantic elements',
  'HTML forms and validation',
  'CSS flexbox layouts',
  'CSS grid layouts',
  'Responsive design with media queries',
  'CSS positioning and z-index',

  // DevOps / Git / Docker
  'Git basic commands',
  'Git branching strategies',
  'Git merge vs rebase',
  'Docker containers',
  'Dockerfile basics',
  'Docker Compose usage',
  'CI/CD pipelines basics',
  'Linux basic commands',
  'Nginx reverse proxy configuration',

  // Testing
  'Unit testing in JavaScript',
  'Unit testing in Python',
  'Integration testing of APIs',
  'Test-driven development basics',

  // Data / ML (simple coding)
  'Implementing linear regression from scratch',
  'Implementing k-means clustering',
  'Implementing k-nearest neighbors',
  'Implementing logistic regression',

  // Misc
  'Working with JSON in JavaScript',
  'Working with CSV files in Python',
  'File upload REST API',
  'Pagination in REST APIs',
];

/* =====================================
   GROSSE LIBRAIRIE DE TOPICS MCQ
   (IT + AUTRES DOMAINES)
===================================== */
const MCQ_TOPICS: string[] = [
  // Programming concepts
  'JavaScript hoisting',
  'JavaScript scope',
  'JavaScript this keyword',
  'JavaScript prototypes',
  'JavaScript event loop',
  'Python list vs tuple',
  'Python mutability',
  'Java inheritance',
  'Java polymorphism',
  'OOP principles (SOLID)',
  'Design patterns basics',

  // Web / HTTP / Security
  'HTTP status codes',
  'REST vs GraphQL',
  'JWT authentication',
  'OAuth2 basics',
  'CSRF and XSS attacks',
  'CORS concepts',
  'HTTPS and TLS basics',

  // Database & data
  'SQL vs NoSQL',
  'ACID properties',
  'Database indexing',
  'Normalization forms',
  'Transactions and isolation levels',
  'Data warehousing concepts',
  'Star schema vs snowflake schema',

  // Algorithms & complexity
  'Big O notation',
  'Time complexity of common operations',
  'Space complexity basics',
  'Stack vs Queue',
  'Tree traversal methods',
  'Hash table collisions',

  // DevOps & architecture
  'Git workflow (feature branch, PR)',
  'Docker vs virtual machines',
  'Microservices architecture',
  'Monolith vs microservices',
  'Message queues (RabbitMQ, Kafka)',
  'Caching strategies',
  'Load balancing basics',
  'Horizontal vs vertical scaling',

  // Cloud & SRE (haut niveau)
  'Cloud service models (IaaS, PaaS, SaaS)',
  'High availability vs fault tolerance',
  'Monitoring and observability basics',

  // === AUTRES DOMAINES ===

  // Mathématiques
  'Basic algebra equations',
  'Linear equations and systems',
  'Matrix operations basics',
  'Derivatives and limits',
  'Probability basics',
  'Conditional probability and Bayes rule',
  'Random variables and distributions',

  // Statistiques & Data
  'Mean, median, mode',
  'Variance and standard deviation',
  'Correlation vs causation',
  'Hypothesis testing basics',
  'p-value interpretation',
  'Confidence intervals basics',

  // Business / Management
  'Basic accounting concepts (assets, liabilities)',
  'Profit and loss statement basics',
  'Cash flow vs profit',
  'Marketing mix (4P)',
  'SWOT analysis',
  'Agile methodology principles',
  'Scrum roles and ceremonies',
  'Project management triple constraint',

  // Finance
  'Simple vs compound interest',
  'Net present value basics',
  'Risk vs return concept',
  'Diversification in portfolios',

  // Soft skills & HR
  'Effective communication skills',
  'Conflict resolution styles',
  'Leadership styles basics',
  'Time management techniques',
  'Teamwork and collaboration',

  // Logic & reasoning
  'Logical operators and truth tables',
  'Common logical fallacies',
  'Syllogisms basics',
  'Patterns and sequences',

  // General knowledge / culture tech
  'Basics of cybersecurity awareness',
  'GDPR core principles',
  'UI vs UX differences',
  'Product lifecycle stages',
];

/* =====================================
   UTILITAIRES
===================================== */
function randomDifficulty(): Difficulty {
  const r = Math.random();
  if (r < 0.5) return 'easy';
  if (r < 0.85) return 'medium';
  return 'hard';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =====================================
   GENERATION CODING (via service AI TS)
===================================== */
async function generateCodingQuestion(topic: string, difficulty: Difficulty) {
  console.log(` CODING "${topic}" (${difficulty})`);

  try {
    const aiResp = await aiQuestionGenerationService.generateQuestion({
      topic,
      difficulty,
    });

    if (!aiResp.success || !aiResp.question) {
      console.error(' AI generation failed for', topic, aiResp.error);
      return null;
    }

    const q = aiResp.question;

    const saved = await questionService.createQuestion({
      title: q.title,
      description: q.explanation,
      problemStatement: q.problemStatement,
      difficulty: q.difficulty as Difficulty,
      skillTags: q.skillTags,
      type: 'coding',
      canonicalSolution: q.canonicalSolution,
      testCases: q.testCases,
      status: 'approved',              // direct library
      aiGenerated: true,
      source: 'library_ai_coding',
      isLibraryQuestion: true,
      createdBy: 'system',
    });

    // Optionnel : vector engine
    try {
      const vec = await vectorEngineService.storeQuestion(saved);
      if (vec.success) {
        await questionService.updateQuestion(saved.id, {
          vectorStored: true,
          vectorId: vec.question_id,
        });
      }
    } catch (e) {
      console.warn('Vector store failed for', saved.id);
    }

    console.log(`SAVED CODING: ${saved.id} - ${saved.title}`);
    return saved;
  } catch (err: any) {
    console.error(` ERROR generating CODING for "${topic}":`, err.message);
    return null;
  }
}

/* =====================================
   GENERATION MCQ (appel direct Python)
===================================== */
async function generateMCQQuestion(topic: string, difficulty: Difficulty) {
  console.log(` MCQ "${topic}" (${difficulty})`);

  try {
    const resp = await fetch(`${AI_SERVICE_URL}/generate/mcq-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty }),
    });

    if (!resp.ok) {
      console.error(' MCQ AI service error:', resp.status);
      return null;
    }

    const data = (await resp.json()) as {
      success: boolean;
      question?: any;
      error?: string;
    };

    if (!data.success || !data.question) {
      console.error(' MCQ generation failed for', topic, data.error);
      return null;
    }

    const q = data.question;

    const saved = await questionService.createQuestion({
      title: q.title,
      description: q.description,
      problemStatement: q.description,
      difficulty: q.difficulty as Difficulty,
      skillTags: q.skillTags,
      type: 'mcq',
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      canonicalSolution: '',
      testCases: {},
      status: 'approved',
      aiGenerated: true,
      source: 'library_ai_mcq',
      isLibraryQuestion: true,
      createdBy: 'system',
    });

    // Optionnel : vector engine aussi pour MCQ
    try {
      const vec = await vectorEngineService.storeQuestion(saved);
      if (vec.success) {
        await questionService.updateQuestion(saved.id, {
          vectorStored: true,
          vectorId: vec.question_id,
        });
      }
    } catch (e) {
      console.warn('⚠️ Vector store failed for MCQ', saved.id);
    }

    console.log(`✅ SAVED MCQ: ${saved.id} - ${saved.title}`);
    return saved;
  } catch (err: any) {
    console.error(`❌ ERROR generating MCQ for "${topic}":`, err.message);
    return null;
  }
}

/* =====================================
   MAIN
===================================== */
async function run() {
  console.log('🚀 Seeding Question Library...\n');
  const start = Date.now();

  let codingSuccess = 0;
  let mcqSuccess = 0;
  let failures = 0;

  console.log(' PHASE 1: CODING QUESTIONS\n');
  for (const topic of CODING_TOPICS) {
    const diff = randomDifficulty();
    const res = await generateCodingQuestion(topic, diff);
    if (res) codingSuccess++;
    else failures++;
    await sleep(1500);
  }

  console.log('\n PHASE 2: MCQ QUESTIONS\n');
  for (const topic of MCQ_TOPICS) {
    const diff = randomDifficulty();
    const res = await generateMCQQuestion(topic, diff);
    if (res) mcqSuccess++;
    else failures++;
    await sleep(1500);
  }

  const minutes = ((Date.now() - start) / 1000 / 60).toFixed(2);
  console.log('\n══════════════════════════════════════');
  console.log('🎉 Library seed finished');
  console.log('⏱️ Duration:', minutes, 'minutes');
  console.log('✅ Coding created:', codingSuccess);
  console.log('✅ MCQ created:', mcqSuccess);
  console.log('❌ Failures:', failures);
  console.log('══════════════════════════════════════');
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Seed script fatal error:', err);
    process.exit(1);
  });
