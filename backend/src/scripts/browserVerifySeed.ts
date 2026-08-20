// backend/src/scripts/browserVerifySeed.ts
//
// Throwaway fixture for the Wave 5 S4 browser walkthrough: one company sitting exactly at the
// free plan's job-slot limit, plus a settled transaction with a receipt so the admin billing
// screen has something real to open.
//
// Prints the localStorage values the dashboards expect. Not referenced by application code.
//
// Run:    npx tsx src/scripts/browserVerifySeed.ts
// Clean:  npx tsx src/scripts/browserVerifySeed.ts --clean
import prisma from '../lib/prisma';
import { generateTokenWithSession } from '../utils/jwt.util';
import { createSession } from '../services/auth/session.service';
import { sha256Hex } from '../utils/tokenHash';
import { issueReceipt } from '../services/payment/receipts.service';
import { PaymentGatewayType, PaymentStatus } from '../types/payment.types';

const COMPANY_ID = 'browserverify-company';
const EMAIL = 'browserverify@probe.test';

const clean = async () => {
  const jobs = await prisma.companyJob.findMany({ where: { company_id: COMPANY_ID }, select: { job_id: true } });
  const jobIds = jobs.map((j) => j.job_id);
  if (jobIds.length) {
    await prisma.aIInterviewResult.deleteMany({ where: { job_id: { in: jobIds } } });
    await prisma.jobApplication.deleteMany({ where: { job_id: { in: jobIds } } });
  }
  await prisma.companyJob.deleteMany({ where: { company_id: COMPANY_ID } });

  const txns = await prisma.paymentTransaction.findMany({ where: { user_id: COMPANY_ID }, select: { transaction_id: true } });
  const ids = txns.map((t) => t.transaction_id);
  if (ids.length) {
    await prisma.$executeRawUnsafe('ALTER TABLE "PaymentReceipt" DISABLE TRIGGER payment_receipt_no_update_or_delete').catch(() => {});
    await prisma.paymentReceipt.deleteMany({ where: { transaction_id: { in: ids } } }).catch(() => {});
    await prisma.$executeRawUnsafe('ALTER TABLE "PaymentReceipt" ENABLE TRIGGER payment_receipt_no_update_or_delete').catch(() => {});
  }
  await prisma.paymentEventLog.deleteMany({ where: { user_id: COMPANY_ID } });
  await prisma.paymentTransaction.deleteMany({ where: { user_id: COMPANY_ID } });
  await prisma.userSubscription.deleteMany({ where: { user_id: COMPANY_ID } });
  await prisma.userSession.deleteMany({ where: { user_id: COMPANY_ID } }).catch(() => {});
  await prisma.companyProfile.deleteMany({ where: { company_id: COMPANY_ID } });
  await prisma.user.deleteMany({ where: { user_id: COMPANY_ID } });
};

const main = async () => {
  await clean();
  if (process.argv.includes('--clean')) {
    console.log('cleaned.');
    return;
  }

  const free = await prisma.subscriptionPlan.findUnique({ where: { plan_id: 'plan_free' } });
  if (!free) throw new Error('plan_free missing — run prisma db seed');

  await prisma.user.create({
    data: {
      user_id: COMPANY_ID,
      email: EMAIL,
      full_name: 'Browser Verify Co',
      role: 'company_admin',
      is_email_verified: true,
    },
  });
  await prisma.companyProfile.create({
    data: { company_id: COMPANY_ID, company_name: 'Browser Verify Co', display_name: 'Browser Verify Co' },
  });

  // Fill the free allowance exactly, so the next create is refused.
  for (let i = 1; i <= free.job_post_limit; i++) {
    await prisma.companyJob.create({
      data: {
        company_id: COMPANY_ID,
        title: `Verify job ${i}`,
        location: 'Remote',
        description: 'Fixture job for the browser walkthrough.',
        status: 'ACTIVE',
      },
    });
  }

  // A settled charge + its receipt, for the admin billing screen.
  const txn = await prisma.paymentTransaction.create({
    data: {
      user_id: COMPANY_ID,
      amount: 699.0,
      currency: 'USD',
      payment_gateway: PaymentGatewayType.STRIPE,
      gateway_payment_id: 'cs_browserverify_demo',
      status: PaymentStatus.SUCCEEDED,
      metadata: { plan_id: 'plan_standard', billing_cycle: 'monthly' },
    },
  });
  const receipt = await issueReceipt(txn.transaction_id);

  const sessionId = await createSession({
    userId: COMPANY_ID,
    jwtToken: 'placeholder',
    userAgent: 'browser-verify',
    ipAddress: '127.0.0.1',
  } as any);
  const token = generateTokenWithSession(COMPANY_ID, 'company_admin', sessionId, undefined, undefined, COMPANY_ID);
  await prisma.userSession.update({
    where: { session_id: sessionId },
    data: { jwt_token_hash: sha256Hex(token) },
  });

  console.log('\n=== company fixture ===');
  console.log(`user_id       : ${COMPANY_ID}`);
  console.log(`jobs (ACTIVE) : ${free.job_post_limit} / ${free.job_post_limit}  (at the free limit)`);
  console.log(`receipt       : ${receipt.receipt_number ?? 'none'}`);
  console.log(`transaction   : ${txn.transaction_id}`);
  console.log('\n=== localStorage ===');
  console.log(`authToken=${token}`);
  console.log(
    `user=${JSON.stringify({ user_id: COMPANY_ID, email: EMAIL, full_name: 'Browser Verify Co', role: 'company_admin', company_id: COMPANY_ID })}`
  );
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
