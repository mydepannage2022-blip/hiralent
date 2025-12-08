// backend/scripts/migrateQuestionsToVectorDB.ts
import { PrismaClient } from '@prisma/client';
import { vectorEngineService } from '../src/services/question/vectorEngine.service';

const prisma = new PrismaClient();

export async function migrateExistingQuestionsToVectorDB() {
  try {
    console.log('🚀 Starting vector database migration...');
    
    // TEMPORARY FIX: Use raw SQL query to bypass TypeScript type checking
    const questions = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM questions 
      WHERE "vectorStored" = false 
      OR "vectorStored" IS NULL
    `;

    console.log(`📦 Found ${questions.length} questions to migrate to vector database...`);

    let successCount = 0;
    let errorCount = 0;

    // Process each question
    for (const [index, question] of questions.entries()) {
      try {
        console.log(`🔄 [${index + 1}/${questions.length}] Migrating: ${question.title}`);
        
        // Store in vector database
        const result = await vectorEngineService.storeQuestion(question);
        
        if (result.success) {
          // Update using raw query to avoid TypeScript errors
          await prisma.$executeRaw`
            UPDATE questions 
            SET "vectorStored" = true, "vectorId" = ${question.id}
            WHERE id = ${question.id}
          `;
          successCount++;
          console.log(`✅ Migrated: ${question.title}`);
        } else {
          errorCount++;
          console.log(`❌ Failed: ${question.title} - ${result.message}`);
        }
        
        // Rate limiting to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        errorCount++;
        console.error(`💥 Error migrating ${question.title}:`, error.message);
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log(`📊 Results: ${successCount} successful, ${errorCount} failed`);
    
    return { successCount, errorCount };
    
  } catch (error: any) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateExistingQuestionsToVectorDB()
    .then((result) => {
      console.log('🏁 Migration script finished');
      console.log(`📊 Final results: ${result.successCount} successful, ${result.errorCount} failed`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}