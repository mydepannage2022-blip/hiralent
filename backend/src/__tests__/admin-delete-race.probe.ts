// admin-delete-race.probe.ts — Session 8 audit fix (F1): the last-admin delete race.
//
// deleteAdmin must never let the platform reach ZERO superadmins. The dangerous shape is a
// check-then-act race: two admins exist, two concurrent deletes each read ">1 remaining" and
// both commit → 0 admins → irrecoverable lockout. The fix wraps the "≥1 survives?" count and the
// delete in ONE Serializable transaction; Postgres SSI detects the write-skew and aborts one.
//
// This probe exercises that DB mechanism directly (the controller has no exported unit): it seeds
// exactly 2 tagged superadmins, fires the two guarded deletes CONCURRENTLY, and asserts at least
// one admin survives. Fail-provable: swap `guardedDelete` for the naive count-then-delete
// (COUNT_THEN_DELETE=1) and both win → 0 survive → this probe FAILS.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/admin-delete-race.probe.ts
// SKIPs cleanly if Postgres is unreachable.

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const TAG = `race-probe-${Date.now()}@example.test`;
const NAIVE = process.env.COUNT_THEN_DELETE === '1'; // fail-prove switch

// Mirror of the controller's guarded delete (Serializable count-then-delete in one tx).
async function guardedDelete(id: string): Promise<'deleted' | 'refused' | 'conflict'> {
  if (NAIVE) {
    // BROKEN control: check then act, NOT atomic — the race the fix closes.
    const remaining = await prisma.user.count({ where: { role: 'superadmin', user_id: { not: id }, email: { contains: TAG } } });
    if (remaining < 1) return 'refused';
    await prisma.user.delete({ where: { user_id: id } });
    return 'deleted';
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        const remaining = await tx.user.count({ where: { role: 'superadmin', user_id: { not: id }, email: { contains: TAG } } });
        if (remaining < 1) return 'refused' as const;
        await tx.user.delete({ where: { user_id: id } });
        return 'deleted' as const;
      },
      { isolationLevel: 'Serializable' }
    );
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2034') return 'conflict';
    throw err;
  }
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('__RESULT__' + JSON.stringify({ ok: true, skipped: 'no DB' }));
    return;
  }

  const failures: string[] = [];
  let a: string | null = null;
  let b: string | null = null;
  try {
    const hash = await bcrypt.hash('irrelevant', 4);
    const ua = await prisma.user.create({ data: { email: `A-${TAG}`, password_hash: hash, full_name: 'Race A', role: 'superadmin', is_email_verified: true } });
    const ub = await prisma.user.create({ data: { email: `B-${TAG}`, password_hash: hash, full_name: 'Race B', role: 'superadmin', is_email_verified: true } });
    a = ua.user_id; b = ub.user_id;

    // Fire both deletes concurrently — each tries to remove the OTHER-surviving admin.
    const [ra, rb] = await Promise.allSettled([guardedDelete(a), guardedDelete(b)]);
    const outcomes = [ra, rb].map((r) => (r.status === 'fulfilled' ? r.value : `throw:${(r.reason as Error)?.message}`));

    const survivors = await prisma.user.count({ where: { role: 'superadmin', email: { contains: TAG } } });

    // THE INVARIANT: never zero admins left.
    if (survivors < 1) failures.push(`INVARIANT VIOLATED: 0 admins survived concurrent delete (outcomes=${JSON.stringify(outcomes)}).`);
    // Sanity: both should not report 'deleted' (that is exactly the lockout).
    const bothDeleted = outcomes.filter((o) => o === 'deleted').length === 2;
    if (bothDeleted) failures.push(`both concurrent deletes reported success → lockout (outcomes=${JSON.stringify(outcomes)}).`);

    console.log(`  survivors=${survivors} outcomes=${JSON.stringify(outcomes)} naive=${NAIVE}`);
  } finally {
    // teardown — remove any tagged rows that survived
    await prisma.user.deleteMany({ where: { email: { contains: TAG } } }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log('__RESULT__' + JSON.stringify({ ok: failures.length === 0, failures }));
  if (failures.length) process.exitCode = 1;
}

main().catch((e) => { console.error('__RESULT__' + JSON.stringify({ ok: false, error: String(e?.message || e) })); process.exitCode = 1; });
