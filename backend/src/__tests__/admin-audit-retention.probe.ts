// admin-audit-retention.probe.ts — Session 9 audit fix (F5): audit logs must OUTLIVE the admin.
//
// AdminAuditLog is a security record. The FK was `admin_id String @relation(onDelete: Cascade)`,
// so deleting an admin CASCADE-deleted that admin's own past action rows — destroying exactly the
// trail the Security Log page exists to preserve. The fix makes admin_id nullable with
// onDelete: SetNull, so on admin delete the row survives with admin_id = NULL (rendered "—").
//
// This probe proves it end-to-end against the live DB: seed a tagged admin, write an audit row
// authored by that admin, delete the admin, assert the row SURVIVES and its admin_id is now NULL.
// Fail-provable: revert the schema to onDelete: Cascade (+ migrate) and the row vanishes → survivors=0.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/admin-audit-retention.probe.ts
// SKIPs cleanly if Postgres is unreachable. Tagged teardown removes anything it created.

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const TAG = `audit-retention-${Date.now()}@example.test`;
const DESC_TAG = `__retention_probe_${Date.now()}__`;

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('__RESULT__' + JSON.stringify({ ok: true, skipped: 'no DB' }));
    return;
  }

  const failures: string[] = [];
  let adminId: string | null = null;
  let logId: string | null = null;

  try {
    const hash = await bcrypt.hash('irrelevant', 4);
    const admin = await prisma.user.create({
      data: { email: TAG, password_hash: hash, full_name: 'Retention Probe', role: 'superadmin', is_email_verified: true },
    });
    adminId = admin.user_id;

    const log = await prisma.adminAuditLog.create({
      data: { admin_id: adminId, action_type: 'DELETE_ADMIN', target_table: 'User', target_id: 'someone', description: DESC_TAG },
    });
    logId = log.log_id;

    // Delete the authoring admin — the moment that used to cascade-wipe this row.
    await prisma.user.delete({ where: { user_id: adminId } });
    adminId = null; // gone

    const after = await prisma.adminAuditLog.findUnique({ where: { log_id: logId } });

    // THE INVARIANT: the security record must survive the admin's deletion.
    if (!after) {
      failures.push('AUDIT ROW LOST: deleting the admin cascade-deleted its own audit row (F5 not fixed).');
    } else {
      if (after.admin_id !== null) failures.push(`expected admin_id NULL after admin delete, got ${after.admin_id}.`);
      // And the read path (getAuditLogs include) must tolerate the now-orphaned row.
      const viaInclude = await prisma.adminAuditLog.findUnique({ where: { log_id: logId }, include: { admin: true } });
      if (viaInclude?.admin !== null) failures.push('include:{admin} did not resolve to null for the orphaned audit row.');
    }

    console.log(`  survived=${!!after} admin_id=${after?.admin_id ?? 'NULL'}`);
  } finally {
    if (logId) await prisma.adminAuditLog.deleteMany({ where: { description: DESC_TAG } }).catch(() => {});
    if (adminId) await prisma.user.delete({ where: { user_id: adminId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: TAG } } }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log('__RESULT__' + JSON.stringify({ ok: failures.length === 0, failures }));
  if (failures.length) process.exitCode = 1;
}

main().catch((e) => { console.error('__RESULT__' + JSON.stringify({ ok: false, error: String(e?.message || e) })); process.exitCode = 1; });
