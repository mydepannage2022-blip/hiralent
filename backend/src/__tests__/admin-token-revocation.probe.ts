// backend/src/__tests__/admin-token-revocation.probe.ts
//
// Wave 4 review (F1) — LIVE proof that a deleted/demoted superadmin's stateless admin JWT
// stops working IMMEDIATELY, because requireSuperAdmin re-checks the DB on every request
// instead of trusting the ~8h token claims.
//
// Fail-provable: remove the DB re-check in adminAuth.middleware.ts and the "deleted token
// rejected" / "demoted token rejected" assertions go RED (the stale token would still pass).
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/admin-token-revocation.probe.ts

process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "probe_admin_secret_value_1234567890";

import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { requireSuperAdmin } from "../middlewares/adminAuth.middleware";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

// Minimal Express req/res/next doubles capturing the outcome of one middleware run.
function runMiddleware(token: string): Promise<{ status: number | null; nexted: boolean; admin: any }> {
  return new Promise((resolve) => {
    let status: number | null = null;
    let nexted = false;
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = {
      status(code: number) { status = code; return this; },
      json() { resolve({ status, nexted, admin: req.admin ?? null }); return this; },
    };
    const next = () => { nexted = true; resolve({ status, nexted, admin: req.admin ?? null }); };
    Promise.resolve(requireSuperAdmin(req, res, next)).catch(() => resolve({ status, nexted, admin: req.admin ?? null }));
  });
}

const mintAdminToken = (user_id: string) =>
  jwt.sign(
    { user_id, email: "probe-admin@hiralent.test", role: "superadmin", authenticated: true, full_name: "Probe Admin" },
    process.env.ADMIN_JWT_SECRET as string,
    { expiresIn: "8h" }
  );

async function main() {
  try {
    await prisma.$connect();
    await prisma.user.count();
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    process.exit(0);
  }

  const uid = `admtok-${Date.now()}`;
  try {
    await prisma.user.create({
      data: { user_id: uid, email: `${uid}@e.com`, password_hash: "x", full_name: "Probe Admin", role: "superadmin", is_email_verified: true },
    });
    const token = mintAdminToken(uid);

    // 1) Live superadmin → token accepted, req.admin set from the DB row.
    const live = await runMiddleware(token);
    check("live superadmin token accepted (next called)", live.nexted === true && live.status === null);
    check("req.admin populated from DB", live.admin?.user_id === uid && live.admin?.role === "superadmin");

    // 2) Demote to a normal role → SAME token must now be rejected (role re-check).
    await prisma.user.update({ where: { user_id: uid }, data: { role: "company" } });
    const demoted = await runMiddleware(token);
    check("demoted admin's stale token rejected (401, not next)", demoted.nexted === false && demoted.status === 401);

    // 3) Delete the user entirely → SAME token must be rejected (existence re-check).
    await prisma.user.update({ where: { user_id: uid }, data: { role: "superadmin" } }); // restore then delete
    await prisma.user.delete({ where: { user_id: uid } });
    const deleted = await runMiddleware(token);
    check("deleted admin's stale token rejected (401, not next)", deleted.nexted === false && deleted.status === 401);
  } finally {
    await prisma.user.deleteMany({ where: { user_id: uid } }).catch(() => {});
    await prisma.$disconnect();
  }

  if (failures) { console.error(`\nadmin-token-revocation.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("\nadmin-token-revocation.probe OK — deleted/demoted admin loses access immediately.");
}

main().catch((e) => { console.error(e); process.exit(1); });
