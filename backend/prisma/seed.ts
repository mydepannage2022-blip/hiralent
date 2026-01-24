import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete existing plans first (optional)
  await prisma.subscriptionPlan.deleteMany({});

  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'Free',
        price_monthly_usd: 0,
        price_annually_usd: 0,
        job_post_limit: 3,
        ai_interview_limit: 5,
        features_included: '["Post up to 3 job listings","Access to active job seekers","Basic support"]',
        is_publicly_available: true,
        stripe_price_id_monthly: '',
        stripe_price_id_annually: ''
      },
      {
        name: 'Standard',
        price_monthly_usd: 699,
        price_annually_usd: 1398,
        job_post_limit: -1,
        ai_interview_limit: 100,
        features_included: '["Unlimited job postings & user accounts","100 candidate views/month","ATS integration for seamless hiring","Detailed analytics & reports","VIP support & quick setup","Internal hiring team management","Enhanced branding & featured jobs"]',
        is_publicly_available: true,
        stripe_price_id_monthly: '',
        stripe_price_id_annually: ''
      },
      {
        name: 'Starter',
        price_monthly_usd: 415,
        price_annually_usd: 830,
        job_post_limit: 3,
        ai_interview_limit: 50,
        features_included: '["3 active job slots, editable","Broader job promotion","1 user, 50 candidate views/month","Employer branding for visibility","Free job edits & updates"]',
        is_publicly_available: true,
        stripe_price_id_monthly: '',
        stripe_price_id_annually: ''
      }
    ]
  });

  console.log('Subscription plans seeded successfully!');
  
  await seedBadges();
}
//seedBadges
async function seedBadges() {
  console.log('🏆 Seeding badges...');
  
  const badges = [
    {
      name: "Profil Complet",
      description: "100% de complétude du profil",
      icon: "✅",
      category: "profile",
      rule_id: "profile_complete",
      criteria: { completeness: 100 }
    },
    {
      name: "Compétences Validées",
      description: "5+ compétences validées par assessments",
      icon: "🎓",
      category: "skill",
      rule_id: "skills_validated",
      criteria: { validated_skills_min: 5 }
    },
    {
      name: "Top 10%",
      description: "Score dans le top 10%",
      icon: "⭐",
      category: "achievement",
      rule_id: "top_scorer",
      criteria: { score_min: 90 }
    },
    {
      name: "Expert Certifié",
      description: "3+ certifications valides",
      icon: "🏆",
      category: "skill",
      rule_id: "certified_expert",
      criteria: { certifications_min: 3 }
    },
    {
      name: "Profil Vérifié",
      description: "Tous les documents vérifiés",
      icon: "✓",
      category: "profile",
      rule_id: "verified_profile",
      criteria: { documents_verified: true }
    }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { rule_id: badge.rule_id },
      update: {},
      create: badge
    });
  }

  console.log('✅ 5 badges seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });