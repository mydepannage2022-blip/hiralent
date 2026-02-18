// scripts/debug-badges-simple.ts
// Simplified version that works with any Prisma schema

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBadges() {
  console.log('🔍 DEBUG: Badge System Status\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Check all badges
    console.log('\n📊 1. ALL BADGES IN DATABASE:');
    console.log('-'.repeat(60));
    
    const allBadges = await prisma.badge.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${allBadges.length} badges:\n`);
    
    allBadges.forEach((badge, index) => {
      console.log(`${index + 1}. ${badge.icon} ${badge.name}`);
      console.log(`   Category: ${badge.category}`);
      console.log(`   Description: ${badge.description}`);
      console.log(`   Criteria: ${JSON.stringify(badge.criteria)}`);
      console.log(`   Active: ${badge.is_active}`);
      console.log('');
    });

    // 2. Check badge awards
    console.log('\n🏆 2. BADGE AWARDS:');
    console.log('-'.repeat(60));
    
    const awards = await prisma.badgeAward.findMany({
      orderBy: { awarded_at: 'desc' }
    });
    
    console.log(`Found ${awards.length} total badge awards\n`);
    
    const activeAwards = awards.filter(a => a.is_active);
    const revokedAwards = awards.filter(a => !a.is_active);
    
    console.log(`✅ Active: ${activeAwards.length}`);
    console.log(`❌ Revoked: ${revokedAwards.length}\n`);
    
    if (activeAwards.length > 0) {
      console.log('Active Badge Awards (simplified view):');
      
      // Group by candidate_id
      const awardsByCandidate = activeAwards.reduce((acc, award) => {
        if (!acc[award.candidate_id]) {
          acc[award.candidate_id] = [];
        }
        acc[award.candidate_id].push(award);
        return acc;
      }, {} as Record<string, typeof activeAwards>);
      
      for (const [candidateId, userAwards] of Object.entries(awardsByCandidate)) {
        console.log(`\n👤 Candidate ID: ${candidateId}`);
        console.log(`   Badges earned: ${userAwards.length}`);
        
        for (const award of userAwards) {
          const badge = allBadges.find(b => b.badge_id === award.badge_id);
          if (badge) {
            console.log(`     ${badge.icon} ${badge.name}`);
            console.log(`        Awarded: ${award.awarded_at.toLocaleString()}`);
          }
        }
      }
    } else {
      console.log('⚠️ No active badge awards found!');
    }

    // 3. Get first candidate details
    console.log('\n\n👤 3. FIRST CANDIDATE CHECK:');
    console.log('-'.repeat(60));
    
    if (activeAwards.length > 0) {
      const firstCandidateId = activeAwards[0].candidate_id;
      const userAwards = activeAwards.filter(a => a.candidate_id === firstCandidateId);
      
      console.log(`\nCandidate ID: ${firstCandidateId}`);
      console.log(`Badges Earned: ${userAwards.length}`);
      
      console.log('\nEarned Badges:');
      for (const award of userAwards) {
        const badge = allBadges.find(b => b.badge_id === award.badge_id);
        if (badge) {
          console.log(`  ${badge.icon} ${badge.name}`);
          console.log(`     Category: ${badge.category}`);
          console.log(`     Awarded: ${award.awarded_at.toLocaleString()}`);
        }
      }
      
      // Try to get profile info (may fail if schema is different)
      try {
        const profile = await prisma.candidateProfile.findUnique({
          where: { candidate_id: firstCandidateId }
        });
        
        if (profile) {
          const name = `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim();
          console.log(`\nProfile Name: ${name || 'N/A'}`);
        }
      } catch (e) {
        console.log('\n(Profile details not available)');
      }
      
      // Try to get completeness
      try {
        const completeness = await prisma.profileCompleteness.findUnique({
          where: { candidate_id: firstCandidateId }
        });
        
        if (completeness) {
          console.log(`\n📊 Profile Completeness: ${completeness.overall_score}%`);
          console.log(`   Basic Info: ${completeness.basic_info_score}%`);
          console.log(`   Skills: ${completeness.skills_score}%`);
          console.log(`   Experience: ${completeness.experience_score}%`);
          console.log(`   Education: ${completeness.education_score}%`);
        }
      } catch (e) {
        console.log('(Completeness data not available)');
      }
    }

    // 4. API Response Simulation
    console.log('\n\n🌐 4. SIMULATED API RESPONSE:');
    console.log('-'.repeat(60));
    
    if (activeAwards.length > 0) {
      const firstCandidateId = activeAwards[0].candidate_id;
      const userAwards = activeAwards.filter(a => a.candidate_id === firstCandidateId);
      
      const badgesResponse = allBadges.map(badge => {
        const award = userAwards.find(a => a.badge_id === badge.badge_id);
        return {
          badge_id: badge.badge_id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          is_earned: !!award,
          awarded_at: award?.awarded_at || null
        };
      });
      
      const earnedBadges = badgesResponse.filter(b => b.is_earned);
      
      console.log('\nGET /api/candidates/profile/badges would return:');
      console.log(JSON.stringify({
        success: true,
        data: {
          badges: earnedBadges
        }
      }, null, 2));
      
      console.log(`\n✨ Total earned badges: ${earnedBadges.length}/${allBadges.length}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Debug complete!\n');
    
    // Summary
    console.log('📝 QUICK SUMMARY:');
    console.log('-'.repeat(60));
    console.log(`Total badges in system: ${allBadges.length}`);
    console.log(`Total badge awards: ${activeAwards.length}`);
    console.log(`Unique users with badges: ${new Set(activeAwards.map(a => a.candidate_id)).size}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBadges()
  .then(() => {
    console.log('\n🎉 Debug script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });