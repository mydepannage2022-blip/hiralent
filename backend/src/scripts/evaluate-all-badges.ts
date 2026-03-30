// scripts/evaluate-all-badges.ts
// Run this ONCE to evaluate badges for all existing users

import { PrismaClient } from '@prisma/client';
import { badgeService } from '../services/candidate/profile/badge.service';
import { completenessService } from '../services/candidate/profile/completeness.service';

const prisma = new PrismaClient();

async function evaluateAllUserBadges() {
  console.log('🚀 Starting badge evaluation for all users...\n');

  try {
    // Get all users with candidateProfile
    const users = await prisma.user.findMany({
      where: {
        role: 'candidate',
        candidateProfile: {
          isNot: null,
        },
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
      },
    });

    console.log(`📊 Found ${users.length} candidates to evaluate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`Processing: ${user.full_name} (${user.email})`);

        // 1. Calculate completeness first
        await completenessService.calculateCompleteness(user.user_id);
        
        // 2. Evaluate and award/revoke badges
        const result = await badgeService.evaluateBadges(user.user_id);
        
        const awarded = result.data?.evaluations.filter(e => e.action === 'award').length || 0;
        const revoked = result.data?.evaluations.filter(e => e.action === 'revoke').length || 0;

        console.log(`  ✅ Badges awarded: ${awarded}, Badges revoked: ${revoked}\n`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ Error for ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📈 Total: ${users.length}\n`);

    console.log('✨ Badge evaluation complete!');

  } catch (error) {
    console.error('❌ Fatal error during badge evaluation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
evaluateAllUserBadges()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });