import 'dotenv/config';
import { QuestionService } from '../src/services/question/Question.service';
import { vectorEngineService } from '../src/services/question/vectorEngine.service';
import { aiQuestionGenerationService } from '../src/services/ai/ai-question-generation.service';

const questionService = new QuestionService();

const TOPICS = [
  'Python lists',
  'JavaScript arrays',
  'SQL JOIN',
  'Binary search',
  'Recursion',
  'Hash tables',
  'Sorting algorithms',
  'REST API basics',
  'OOP principles',
  'Docker basics',
  'Git branching',
  'React hooks',
  'Node.js event loop',
  'Python exceptions',
  'Java streams',
  'Database indexing',
  'HTTP status codes',
  'JWT authentication',
  'Time complexity',
  'CSS flexbox'
];

async function run() {
  console.log('🚀 Mini seed test (20 questions)\n');

  let ok = 0;
  let vectorOk = 0;

  for (const topic of TOPICS) {
    console.log(`🔹 Generating: ${topic}`);

    const ai = await aiQuestionGenerationService.generateQuestion({
      topic,
      difficulty: 'easy',
    });

    if (!ai.success || !ai.question) {
      console.error('❌ AI failed');
      continue;
    }

    const saved = await questionService.createQuestion({
      title: ai.question.title,
      description: ai.question.explanation,
      problemStatement: ai.question.problemStatement,
      difficulty: 'easy',
      skillTags: ai.question.skillTags,
      type: 'coding',
      canonicalSolution: ai.question.canonicalSolution,
      testCases: ai.question.testCases,
      status: 'approved',
      aiGenerated: true,
      source: 'seed_test',
      isLibraryQuestion: true,
      createdBy: 'system',
    });

    ok++;

    try {
      const vec = await vectorEngineService.storeQuestion(saved);
      if (vec.success) {
        await questionService.updateQuestion(saved.id, {
          vectorStored: true,
          vectorId: vec.question_id,
        });
        vectorOk++;
        console.log(`✅ Vector OK (${saved.id})`);
      } else {
        console.warn(`⚠️ Vector FAILED (${saved.id})`);
      }
    } catch (e) {
      console.warn(`⚠️ Vector ERROR (${saved.id})`);
    }
  }

  console.log('\n==============================');
  console.log('Seed finished');
  console.log('Questions created:', ok);
  console.log('Vectors created:', vectorOk);
  console.log('==============================');
}

run().then(() => process.exit(0));
