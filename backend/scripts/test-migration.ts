// backend/scripts/test-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMigrationReadiness() {
  try {
    // 1. Check database connection
    const questionCount = await prisma.question.count();
    console.log(`📊 Total questions in database: ${questionCount}`);
    
    // 2. Check unmigrated questions
    const unmigrated = await prisma.question.count({
      where: { vectorStored: false }
    });
    console.log(`📦 Questions needing migration: ${unmigrated}`);
    
    // 3. Check a few sample questions
    const sampleQuestions = await prisma.question.findMany({
      where: { vectorStored: false },
      take: 3,
      select: { id: true, title: true, type: true }
    });
    
    console.log('🔍 Sample questions to migrate:');
    sampleQuestions.forEach(q => {
      console.log(`   - ${q.title} (${q.type})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMigrationReadiness();