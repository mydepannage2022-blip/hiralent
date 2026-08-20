// backend/src/scripts/release.ts
//
// Deploy-time release step: migrate → seed → VERIFY. Wave 8-lite / W-3.
// Wired as Railway's pre-deploy command (see backend/railway.toml).
//
//   Image:  node dist/src/scripts/release.js      (cwd must be the backend root, /app)
//   Local:  npx tsx src/scripts/release.ts
//
// ── Why this is a script and not two chained shell commands ──────────────────────────────────
// `prisma migrate deploy && prisma db seed` would report success in situations that leave the
// platform unusable, because the seed is deliberately fail-SOFT in places:
//
//   • `prisma/seeds/superadmin.seed.ts` SKIPS creating the admin — with only a console.warn and
//     a zero exit — when NODE_ENV is not development/test and SUPERADMIN_PASSWORD is unset.
//     A deploy would go green with NO ADMIN ACCOUNT, and nobody would find out until someone
//     tried to log in.
//   • If the `SubscriptionPlan` rows are missing, Wave 5's entitlement engine is fail-closed:
//     every quota reads zero and every gated action 403s. The app boots fine and looks broken.
//
// So this script asserts the POST-CONDITIONS that actually matter, and fails the deploy when
// they are not met. "The release command exited 0" should mean the platform is usable.
//
// ── Migrations and the pooler ────────────────────────────────────────────────────────────────
// `prisma migrate deploy` uses `directUrl` (schema.prisma) = DIRECT_DATABASE_URL, which must
// bypass transaction pooling — pooling breaks DDL. On Supabase that is the SESSION pooler, not
// the `db.<ref>.supabase.co` direct host (IPv6-only; Railway egress is IPv4). See the Wave
// 8-lite plan, gotchas G-1/G-2.

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import prisma, { disconnectDB } from '../lib/prisma';

function log(msg: string): void {
  console.log(`[release] ${msg}`);
}

function fail(msg: string): never {
  console.error(`\n❌ [release] ${msg}\n`);
  process.exit(1);
}

/** Run a command, inheriting stdio, and reject the deploy if it exits non-zero. */
function run(label: string, command: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    log(`${label} → ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { stdio: 'inherit', cwd: process.cwd() });
    child.on('error', (err) => fail(`${label} could not start: ${err.message}`));
    child.on('close', (code) => {
      if (code !== 0) fail(`${label} exited with code ${code} — aborting the deploy.`);
      resolve();
    });
  });
}

/**
 * Resolve the Prisma CLI's JS entrypoint from its own package manifest, so it can be run as
 * `node <entry>`. Spawning `node_modules/.bin/prisma` instead would need shell handling on
 * Windows (`.cmd`), and hardcoding `build/index.js` would break on a Prisma layout change.
 */
function resolvePrismaCli(): string {
  const pkgPath = require.resolve('prisma/package.json');
  const pkg = require(pkgPath) as { bin?: string | Record<string, string> };
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.prisma;
  if (!bin) fail('Could not resolve the Prisma CLI entrypoint from prisma/package.json.');
  return path.join(path.dirname(pkgPath), bin);
}

/**
 * The seed entry. Prefer the COMPILED output: `prisma/` is inside tsconfig's `include`, so
 * `pnpm build` emits `dist/prisma/seed.js`. Running that with plain `node` keeps the release
 * path free of `tsx` (a devDependency) entirely. Falls back to the TS source for local runs.
 */
function resolveSeedCommand(): { command: string; args: string[] } {
  const compiled = path.join('dist', 'prisma', 'seed.js');
  if (existsSync(compiled)) return { command: process.execPath, args: [compiled] };

  const tsx = path.join('node_modules', 'tsx', 'dist', 'cli.mjs');
  if (existsSync(tsx)) return { command: process.execPath, args: [tsx, path.join('prisma', 'seed.ts')] };

  return fail(
    'No seed entry found. Expected dist/prisma/seed.js (run `pnpm build`) or a local tsx install.'
  );
}

function preflight(): void {
  if (!(process.env.DATABASE_URL || '').trim()) {
    fail('DATABASE_URL is not set.');
  }
  if (!(process.env.DIRECT_DATABASE_URL || '').trim()) {
    fail(
      'DIRECT_DATABASE_URL is not set. `prisma migrate deploy` uses it (schema.prisma `directUrl`) ' +
        'to reach Postgres WITHOUT transaction pooling — pooling breaks DDL.'
    );
  }
  log(`NODE_ENV=${process.env.NODE_ENV ?? '(unset)'}`);
}

/**
 * Post-conditions. Each one is a state the platform genuinely cannot work without, and each one
 * can be false while every command above has exited 0.
 */
async function verify(): Promise<void> {
  const problems: string[] = [];

  // 1. Subscription plans — `plan_free` in particular. Wave 5 entitlements are fail-closed:
  //    without it every quota reads zero and every gated action 403s.
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { plan_id: 'plan_free' } });
  const planCount = await prisma.subscriptionPlan.count();
  if (!freePlan) {
    problems.push(
      "SubscriptionPlan 'plan_free' is missing. Entitlements are fail-closed, so every quota " +
        'would read zero and every gated feature would return 403.'
    );
  } else {
    log(`✅ subscription plans present (${planCount}, incl. plan_free)`);
  }

  // 2. A superadmin must exist. The seed skips creating one — with a zero exit — when
  //    SUPERADMIN_PASSWORD is unset outside development/test.
  const superadmins = await prisma.user.count({ where: { role: 'superadmin' } });
  if (superadmins === 0) {
    problems.push(
      'No superadmin user exists. The superadmin seed skips creation (warning only, exit 0) when ' +
        'SUPERADMIN_PASSWORD is unset and NODE_ENV is not development/test — set SUPERADMIN_PASSWORD ' +
        'and redeploy, or the platform has no admin access at all.'
    );
  } else {
    log(`✅ superadmin present (${superadmins})`);
  }

  // 3. RBAC baseline — role permissions drive authorisation checks.
  const rolePermissions = await prisma.rolePermission.count();
  if (rolePermissions === 0) {
    problems.push('No RolePermission rows exist — the RBAC baseline did not seed.');
  } else {
    log(`✅ role permissions present (${rolePermissions})`);
  }

  if (problems.length) {
    console.error('\n❌ [release] post-deploy verification FAILED:');
    for (const p of problems) console.error(`   • ${p}`);
    console.error('');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  log('starting release step');
  preflight();

  await run('migrate', process.execPath, [resolvePrismaCli(), 'migrate', 'deploy']);

  const seed = resolveSeedCommand();
  await run('seed', seed.command, seed.args);

  log('verifying post-conditions');
  await verify();

  log('✅ release complete — migrations applied, core data present');
}

main()
  .catch((e) => {
    console.error('[release] unexpected failure:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => undefined);
    process.exit(process.exitCode ?? 0);
  });
