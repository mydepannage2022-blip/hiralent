import 'dotenv/config';
import prisma from '../lib/prisma';
import { enqueueAiCompanySetupRecompute } from '../queues/aiCompanySetup.queue';

async function main() {
  const companyId = 'cmp_dev';

  // 1) Assurer l’USER d’abord (FK cible de CompanyProfile.company_id)
  await prisma.user.upsert({
    where: { user_id: companyId },
    create: {
      user_id: companyId,
      email: 'devco+cmp_dev@example.com', // doit être unique
      password_hash: 'dev-hash',          // string factice OK
      full_name: 'DevCo Admin',
      role: 'company_admin',
      is_email_verified: true,
    },
    update: {}, // rien à mettre pour le test
  });

  // 2) Upsert du CompanyProfile (pointe vers user_id = cmp_dev)
  await prisma.companyProfile.upsert({
    where: { company_id: companyId },
    create: {
      company_id: companyId,
      company_name: 'DevCo',
      verified: true,
      preferred_language: 'fr',
      website: 'https://example.com',
      linkedin_profile: 'https://linkedin.com/company/example',
      industry: 'Software',
      description: 'Company test pour insights',
    },
    update: {
      verified: true,
      preferred_language: 'fr',
      website: 'https://example.com',
      linkedin_profile: 'https://linkedin.com/company/example',
    },
  });

  // 3) Enqueue le job pour le worker
  await enqueueAiCompanySetupRecompute(companyId);
  console.log('✅ Job enqueued for', companyId);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
