// backend/src/__tests__/notification-prefs.probe.ts
//
// Wave 4 / Session 7 — Dead-ends: Candidate + Agency (Phase 4.2 + 4.3-agency).
// LIVE proof that notification preferences PERSIST to Postgres (the agency/company/
// candidate settings toggles previously vanished on reload — stub controller / local
// state / localStorage only).
//
// Self-gating: SKIP + exit 0 if Postgres is unreachable.
//
// Fail-provable, non-vacuous:
//   (A) PERSISTENCE — after upsert, a FRESH findUnique (not the returned object) must
//       read back the exact toggles. Make upsertNotificationPreferences a no-op →
//       read comes back {} → probe RED. This is the "survives restart, not in-memory"
//       guarantee: a brand-new query hits the row on disk.
//   (B) DEFAULTS — a user with no row reads {} (frontend merges over its role defaults).
//   (C) IDEMPOTENT OVERWRITE — a second upsert overwrites in place (one row, new values),
//       never a duplicate.
//   (D) CASCADE — deleting the user removes the prefs row (FK onDelete: Cascade).
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/notification-prefs.probe.ts

import prisma from "../lib/prisma";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "../services/notificationPreferences.service";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const TAG = `notifprefs-${Date.now()}`;
const userId = `${TAG}-user`;

// Agency-shaped key-set; the store is role-neutral so any boolean map works.
const PREFS_A = {
  emailNotifications: true,
  caseUpdates: false,
  newClients: true,
  systemAlerts: false,
  weeklyReports: true,
};
const PREFS_B = {
  emailNotifications: false,
  caseUpdates: true,
  newClients: false,
};

async function main() {
  try {
    await prisma.$connect();
    await prisma.userNotificationPreferences.count();
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("notification-prefs.probe SKIPPED (no DB).");
    process.exit(0);
  }

  try {
    await prisma.user.create({
      data: { user_id: userId, email: `${userId}@e.com`, password_hash: "x", full_name: "Prefs Probe", role: "agency_admin", is_email_verified: true },
    });

    // ---- (B) DEFAULTS: no row yet → {} ----
    const empty = await getNotificationPreferences(userId);
    check("no row → getNotificationPreferences returns {}", JSON.stringify(empty) === "{}");

    // ---- (A) PERSISTENCE: upsert then read back with a FRESH query ----
    await upsertNotificationPreferences(userId, PREFS_A);

    const readBack = await getNotificationPreferences(userId);
    check("persisted emailNotifications=true", readBack.emailNotifications === true);
    check("persisted caseUpdates=false", readBack.caseUpdates === false);
    check("persisted newClients=true", readBack.newClients === true);
    check("persisted systemAlerts=false", readBack.systemAlerts === false);
    check("persisted weeklyReports=true", readBack.weeklyReports === true);

    // Prove it's really on disk, not a returned-object illusion: raw findUnique.
    // NOTE: JSONB does not preserve key order, so compare by keys/values, not stringify.
    const raw = await prisma.userNotificationPreferences.findUnique({ where: { user_id: userId } });
    const rawPrefs = (raw?.preferences ?? {}) as Record<string, boolean>;
    check("row exists on disk (findUnique non-null)", raw !== null);
    check(
      "disk prefs deep-match upserted prefs (order-independent)",
      Object.keys(PREFS_A).length === Object.keys(rawPrefs).length &&
        Object.entries(PREFS_A).every(([k, v]) => rawPrefs[k] === v)
    );

    // ---- (C) IDEMPOTENT OVERWRITE: second upsert overwrites, no duplicate row ----
    await upsertNotificationPreferences(userId, PREFS_B);
    const rowCount = await prisma.userNotificationPreferences.count({ where: { user_id: userId } });
    check("still exactly 1 row after re-save (upsert, not insert)", rowCount === 1);

    const readB = await getNotificationPreferences(userId);
    check("overwrite applied: emailNotifications=false", readB.emailNotifications === false);
    check("overwrite applied: caseUpdates=true", readB.caseUpdates === true);
    check("overwrite dropped stale keys (no systemAlerts)", !("systemAlerts" in readB));

    // ---- (D) CASCADE: deleting the user removes the prefs row ----
    await prisma.user.delete({ where: { user_id: userId } });
    const afterDelete = await prisma.userNotificationPreferences.findUnique({ where: { user_id: userId } });
    check("FK onDelete: Cascade — prefs row gone after user delete", afterDelete === null);
  } finally {
    // Defensive: if an assertion threw before the cascade delete, clean up.
    await prisma.userNotificationPreferences.deleteMany({ where: { user_id: userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { user_id: userId } }).catch(() => {});
    await prisma.$disconnect();
  }

  if (failures) { console.error(`\nnotification-prefs.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("\nnotification-prefs.probe OK — prefs persist to Postgres, defaults + overwrite + cascade have teeth.");
}

main().catch((e) => { console.error(e); process.exit(1); });
