// backend/src/scripts/reconcile-payments.ts
//
// On-demand gateway ↔ DB payment reconciliation. Same read-only service the nightly scheduler
// runs; this is the operator entry point for "did we miss a webhook?".
//
// Run:  cd backend && npx tsx src/scripts/reconcile-payments.ts [--days 30] [--limit 200]
// Or:   node hiralent-master-plan/tools/reconcile.mjs
//
// Exit code is 0 when the run completed — a mismatch is a finding to read, not a crash. Exit 1
// means the run itself could not be performed.
import prisma from '../lib/prisma';
import { reconcilePayments } from '../services/payment/reconciliation.service';

const arg = (flag: string, fallback: number): number => {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

const main = async () => {
  const days = arg('--days', 30);
  const limit = arg('--limit', 200);

  console.log(`Reconciling Stripe transactions from the last ${days} day(s), max ${limit}...\n`);

  const report = await reconcilePayments({
    since: new Date(Date.now() - days * 86400_000),
    limit,
  });

  if (!report.gateway_configured) {
    console.log('SKIPPED — STRIPE_SECRET_KEY is not set, so the gateway cannot be queried.');
    console.log('This is NOT a clean bill of health: nothing was checked.');
    return;
  }

  console.log(`Checked:  ${report.checked}`);
  console.log(`Skipped:  ${report.skipped}`);
  console.log(`Mismatch: ${report.mismatches.length}`);
  console.log(`Duration: ${report.finished_at.getTime() - report.started_at.getTime()}ms\n`);

  if (!report.mismatches.length) {
    console.log('✅ Every checked transaction agrees with Stripe.');
    return;
  }

  console.log('⚠️  Mismatches (reported only — nothing was changed):\n');
  for (const m of report.mismatches) {
    console.log(`  ${m.transaction_id}`);
    console.log(`    user:    ${m.user_id}`);
    console.log(`    gateway: ${m.gateway_payment_id}`);
    console.log(`    db=${m.db_status}  stripe=${m.gateway_status}  amount=${m.amount} ${m.currency}`);
    console.log(`    kind:    ${m.kind}${m.note ? ` (${m.note})` : ''}`);
    console.log(`    created: ${m.created_at.toISOString()}\n`);
  }
  console.log('Each mismatch is also recorded in PaymentEventLog as reconcile.mismatch.');
};

main()
  .catch((err) => {
    console.error('Reconciliation run failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
