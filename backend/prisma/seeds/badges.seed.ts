// prisma/seeds/badges.seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Badge Definitions
 * Each badge has:
 * - rule_id: Unique identifier for the rule logic
 * - name: Display name
 * - description: What the badge represents
 * - icon: Emoji or icon identifier
 * - category: Badge category (profile, skills, achievement, etc.)
 * - criteria: JSON object defining the conditions to earn the badge
 */

const BADGES = [
  {
    rule_id: 'profile_complete',
    name: 'Profile Master',
    description: 'Complete your profile 100%',
    icon: '✨',
    category: 'profile',
    criteria: {
      completeness: 100, // overall_score >= 100
    },
    is_active: true,
  },
  {
    rule_id: 'skills_validated',
    name: 'Skill Expert',
    description: 'Validate 5 or more skills through assessments',
    icon: '🎯',
    category: 'skills',
    criteria: {
      validated_skills_min: 5, // is_verified skills count >= 5
    },
    is_active: true,
  },
  {
    rule_id: 'top_scorer',
    name: 'Top 10%',
    description: 'Achieve a quality score of 90 or higher',
    icon: '🏆',
    category: 'achievement',
    criteria: {
      score_min: 90, // total_score >= 90
    },
    is_active: true,
  },
  {
    rule_id: 'certified_expert',
    name: 'Certified Professional',
    description: 'Add 3 or more valid professional certifications',
    icon: '📜',
    category: 'credentials',
    criteria: {
      certifications_min: 3, // active certifications >= 3
    },
    is_active: true,
  },
  {
    rule_id: 'verified_profile',
    name: 'Verified Identity',
    description: 'All documents verified successfully',
    icon: '✅',
    category: 'verification',
    criteria: {
      all_documents_verified: true, // all documents extraction_status === 'completed'
    },
    is_active: true,
  },
  {
    rule_id: 'early_adopter',
    name: 'Early Bird',
    description: 'One of the first candidates to complete their profile',
    icon: '🐦',
    category: 'special',
    criteria: {
      completeness: 100,
      created_before: '2026-03-01', // Example: early adopter cutoff
    },
    is_active: true,
  },
  {
    rule_id: 'assessment_champion',
    name: 'Assessment Champion',
    description: 'Complete 10 or more skill assessments',
    icon: '💪',
    category: 'skills',
    criteria: {
      assessments_completed_min: 10,
    },
    is_active: true,
  },
  {
    rule_id: 'consistent_performer',
    name: 'Consistent Performer',
    description: 'Maintain a score above 85 for 30 days',
    icon: '📈',
    category: 'achievement',
    criteria: {
      score_min: 85,
      consistency_days: 30,
    },
    is_active: true,
  },
];

/**
 * Seed badges into database
 */
export async function seedBadges() {
  console.log('🌱 Starting badge seeding...');

  try {
    // Clear existing badges (optional - remove in production)
    // await prisma.badge.deleteMany({});
    // console.log('🗑️  Cleared existing badges');

    // Upsert badges (create or update)
    for (const badge of BADGES) {
      await prisma.badge.upsert({
        where: { rule_id: badge.rule_id },
        update: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          criteria: badge.criteria as any,
          is_active: badge.is_active,
        },
        create: {
          rule_id: badge.rule_id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          criteria: badge.criteria as any,
          is_active: badge.is_active,
        },
      });

      console.log(`✅ Badge created/updated: ${badge.name} (${badge.rule_id})`);
    }

    console.log(`\n🎉 Successfully seeded ${BADGES.length} badges!`);
    
    // Display summary
    console.log('\n📊 Badge Summary:');
    const badges = await prisma.badge.findMany({
      where: { is_active: true },
      select: {
        rule_id: true,
        name: true,
        category: true,
      },
    });

    badges.forEach((badge) => {
      console.log(`   ${badge.name} [${badge.category}]`);
    });

  } catch (error) {
    console.error('❌ Error seeding badges:', error);
    throw error;
  }
}

/**
 * Run seed if executed directly
 */
if (require.main === module) {
  seedBadges()
    .then(() => {
      console.log('\n✨ Badge seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Badge seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}