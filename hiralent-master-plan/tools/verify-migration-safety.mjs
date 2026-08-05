#!/usr/bin/env node
/**
 * verify-migration-safety.mjs — Wave 2 / Session 3 (Phase 2.2, R-07 / R-21) — INFRA
 *
 * Proves the migration chain is safe to deploy FRESH, and that a fresh DB can be
 * built from the committed migrations alone — without ever touching the primary DB.
 *
 *   Static (offline):
 *     1. migration_lock.toml provider is `postgresql`.
 *     2. The on-disk migration chain has EXACTLY ONE duplicate-label pair, and it is the
 *        known-harmless `add_pattern_generation_fields` (a NEW accidental dup fails — 2.2b).
 *     3. schema.prisma declares NO `shadowDatabaseUrl` (R-07: `migrate dev` can't be pointed
 *        at prod through the schema).
 *     4. package.json `db:migrate` === `prisma migrate deploy` (the deploy migrate step is
 *        DEFINED — full platform wiring is Wave 8, 2.2c).
 *
 *   Live (throwaway DB — NEVER the primary `hiralent`):
 *     5. Create a fresh empty DB `hiralent_s3_migtest`, run `prisma migrate deploy` against it,
 *        assert it exits 0 and `migrate status` reports up-to-date, and assert the applied
 *        `_prisma_migrations` count equals the on-disk folder count (the whole 57-migration
 *        chain applies cleanly from empty — 2.2a). The throwaway DB is dropped in `finally`.
 *
 * The throwaway DB is created/dropped via a Prisma raw probe against the `postgres`
 * maintenance DB (the repo has no `pg` client; DDL runs standalone/autocommit via
 * $executeRawUnsafe). `migrate deploy`/`status` receive the throwaway URL through a
 * spawn-injected DATABASE_URL/DIRECT_DATABASE_URL (dotenv does not override existing env).
 *
 * Exit 0 => chain is fresh-deployable + config shape holds. Exit 1 => prints why.
 * Node built-ins only. Windows-safe (no shell). Fails loudly (not silently) if Postgres or
 * the prisma CLI is unavailable.
 *
 * Usage: node hiralent-master-plan/tools/verify-migration-safety.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');
const PRISMA_CLI = path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js');
const MIGRATIONS_DIR = path.join(BACKEND, 'prisma', 'migrations');
const SCHEMA = path.join(BACKEND, 'prisma', 'schema.prisma');
const PKG = path.join(BACKEND, 'package.json');

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const THROWAWAY_DB = 'hiralent_s3_migtest'; // NEVER the primary `hiralent`
const KNOWN_DUP_LABEL = 'add_pattern_generation_fields';

const errors = [];
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

function tcpReachable(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (v) => { if (!done) { done = true; socket.destroy(); resolve(v); } };
    socket.setTimeout(ms);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/** Read backend/.env DATABASE_URL, strip query params. Fallback to the repo default. */
function readBaseUrl() {
  const raw = read(path.join(BACKEND, '.env'));
  if (raw) {
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return v.split('?')[0];
      }
    }
  }
  return 'postgresql://postgres:huzaifa@localhost:5432/hiralent';
}

/** Swap the database name (segment after the last '/') on a query-less base URL. */
function withDbName(base, dbName) {
  const i = base.lastIndexOf('/');
  return base.slice(0, i) + '/' + dbName;
}

/** Write a tsx probe INTO backend/ (so pnpm resolves `@prisma/client`), run it, parse __RESULT__. */
function runProbe(fileName, source, extraEnv, timeoutMs) {
  const TSX_CLI = path.join(BACKEND, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const probePath = path.join(BACKEND, fileName);
  try {
    fs.writeFileSync(probePath, source);
    const r = spawnSync(process.execPath, [TSX_CLI, fileName], {
      cwd: BACKEND, encoding: 'utf8', timeout: timeoutMs,
      env: { ...process.env, ...extraEnv }, maxBuffer: 16 * 1024 * 1024,
    });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = out.split(/\r?\n/).find((l) => l.includes('__RESULT__'));
    if (!line) return { ok: false, error: `no __RESULT__ (exit ${r.status}): ${out.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}` };
    return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length));
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  } finally {
    try { fs.unlinkSync(probePath); } catch { /* ignore */ }
  }
}

// A raw-SQL probe: connect to an admin URL and run a DROP-then-CREATE (create) or DROP (drop).
// CREATE/DROP DATABASE cannot run in a transaction; $executeRawUnsafe runs each standalone.
const PROBE_DDL = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const ADMIN = process.env.HIRALENT_ADMIN_URL;
const DB = process.env.HIRALENT_DDL_DB;
const ACTION = process.env.HIRALENT_DDL_ACTION; // 'create' | 'drop'
const admin = new PrismaClient({ datasources: { db: { url: ADMIN } } });
const dropDb = async () => {
  try {
    await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '" WITH (FORCE)');
  } catch (e) {
    // Older Postgres (<13) has no WITH (FORCE): terminate backends then plain drop.
    await admin.$executeRawUnsafe("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='" + DB + "' AND pid<>pg_backend_pid()");
    await admin.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + DB + '"');
  }
};
(async () => {
  const out = {};
  try {
    await admin.$connect();
    await dropDb();
    if (ACTION === 'create') await admin.$executeRawUnsafe('CREATE DATABASE "' + DB + '"');
    out.ok = true;
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await admin.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

// Count fully-applied migrations in the throwaway DB's _prisma_migrations table.
const PROBE_COUNT = `
import PkgClient from '@prisma/client';
const { PrismaClient } = PkgClient;
const db = new PrismaClient({ datasources: { db: { url: process.env.HIRALENT_TARGET_URL } } });
(async () => {
  const out = {};
  try {
    await db.$connect();
    const r = await db.$queryRawUnsafe("SELECT count(*)::int AS c FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
    out.ok = true; out.count = Number(r[0].c);
  } catch (e) { out.ok = false; out.error = String(e && e.message ? e.message : e); }
  finally { try { await db.$disconnect(); } catch {} }
  process.stdout.write('\\n__RESULT__' + JSON.stringify(out) + '\\n');
  process.exit(0);
})();
`;

function prisma(args, env) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND, encoding: 'utf8', timeout: 180000,
    env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024,
  });
}

// ---- 1-4. Static shape --------------------------------------------------------
function staticChecks() {
  // migration folders + provider
  let folders = [];
  try {
    folders = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch { errors.push(`migrations dir not found at ${path.relative(ROOT, MIGRATIONS_DIR)}`); }
  const lock = read(path.join(MIGRATIONS_DIR, 'migration_lock.toml'));
  if (!lock || !/provider\s*=\s*"postgresql"/.test(lock)) {
    errors.push('migration_lock.toml must declare provider = "postgresql".');
  }
  if (folders.length < 50) errors.push(`only ${folders.length} migration folders found (expected the full ~57 chain) — has the chain been truncated?`);

  // duplicate-label analysis: exactly one dup pair, and it must be the known-harmless one.
  const labelCounts = new Map();
  for (const name of folders) {
    const label = name.replace(/^\d+_/, '');
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
  }
  const dups = [...labelCounts.entries()].filter(([, n]) => n > 1).map(([l]) => l);
  const unexpected = dups.filter((l) => l !== KNOWN_DUP_LABEL);
  if (unexpected.length) {
    errors.push(`NEW duplicate migration label(s) detected: ${unexpected.join(', ')} — rename or squash (only "${KNOWN_DUP_LABEL}" is documented-harmless).`);
  }
  if (!dups.includes(KNOWN_DUP_LABEL)) {
    // Not fatal on its own, but the doc claims it exists; surface if it vanished.
    console.log(`  [static] note: documented dup-label "${KNOWN_DUP_LABEL}" no longer present (chain changed).`);
  }

  // schema: no shadowDatabaseUrl (R-07)
  const schema = read(SCHEMA);
  if (schema == null) errors.push('schema.prisma not found.');
  else if (/\bshadowDatabaseUrl\b/.test(schema)) {
    errors.push('schema.prisma must NOT declare shadowDatabaseUrl (R-07: keeps `migrate dev` from being pointed at prod through the schema).');
  }

  // package.json db:migrate === prisma migrate deploy
  const pkgRaw = read(PKG);
  let pkg = null;
  try { pkg = JSON.parse(pkgRaw); } catch { errors.push('backend/package.json unreadable.'); }
  if (pkg) {
    const s = (pkg.scripts && pkg.scripts['db:migrate']) || '';
    if (!/prisma\s+migrate\s+deploy/.test(s)) {
      errors.push(`backend/package.json "db:migrate" must be "prisma migrate deploy" (the defined deploy migrate step, 2.2c) — found: ${JSON.stringify(s)}.`);
    }
  }
  return folders.length;
}

// ---- 5. Live fresh-deploy proof ----------------------------------------------
async function liveChecks(folderCount) {
  if (!fs.existsSync(PRISMA_CLI)) { errors.push(`prisma CLI not found at ${path.relative(ROOT, PRISMA_CLI)} — run pnpm install in backend.`); return; }
  if (!(await tcpReachable(PG_HOST, PG_PORT))) { errors.push(`Postgres not reachable on ${PG_HOST}:${PG_PORT} — start it (docker compose up -d postgres) before this gate.`); return; }

  const base = readBaseUrl();
  const adminUrl = withDbName(base, 'postgres');       // maintenance DB for DDL
  const targetUrl = withDbName(base, THROWAWAY_DB);    // fresh throwaway

  let created = false;
  try {
    // create fresh empty DB
    const c = runProbe('.__mig_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: THROWAWAY_DB, HIRALENT_DDL_ACTION: 'create' }, 60000);
    if (!c.ok) { errors.push(`could not create throwaway DB ${THROWAWAY_DB}: ${c.error}`); return; }
    created = true;

    // migrate deploy against the throwaway (migrate uses directUrl = DIRECT_DATABASE_URL)
    const dep = prisma(['migrate', 'deploy'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    if (dep.status !== 0) {
      const tail = `${dep.stdout || ''}${dep.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
      errors.push(`prisma migrate deploy FAILED on empty DB (exit ${dep.status}):\n    ${tail}`);
      return;
    }

    // migrate status: must be up to date / no pending
    const st = prisma(['migrate', 'status'], { DATABASE_URL: targetUrl, DIRECT_DATABASE_URL: targetUrl });
    const stOut = `${st.stdout || ''}${st.stderr || ''}`;
    if (st.status !== 0 && !/up to date/i.test(stOut)) {
      const tail = stOut.split(/\r?\n/).filter(Boolean).slice(-8).join('\n    ');
      errors.push(`migrate status not clean after deploy (exit ${st.status}):\n    ${tail}`);
    }

    // applied count must equal the on-disk folder count (whole chain applied)
    const cnt = runProbe('.__mig_count.ts', PROBE_COUNT, { HIRALENT_TARGET_URL: targetUrl }, 60000);
    if (!cnt.ok) {
      errors.push(`could not read _prisma_migrations from throwaway DB: ${cnt.error}`);
    } else if (cnt.count !== folderCount) {
      errors.push(`applied migration count ${cnt.count} != ${folderCount} on-disk folders — chain did not fully apply to the empty DB.`);
    } else {
      console.log(`  [live] fresh DB "${THROWAWAY_DB}": migrate deploy applied all ${cnt.count} migrations cleanly; status up-to-date.`);
    }

    // NO-DRIFT: schema.prisma must be FULLY produced by the migration chain. `migrate deploy`
    // above only proves migrations *apply* — not that they match the schema. A schema object
    // (e.g. an @@index) added without a migration would deploy a DB missing it, silently.
    // Compare schema.prisma against the just-deployed throwaway (no shadow DB needed):
    //   exit 0 => identical (no drift); exit 2 => schema has objects the migrations don't create.
    const diff = prisma(['migrate', 'diff', '--from-url', targetUrl, '--to-schema-datamodel', './prisma/schema.prisma', '--exit-code'], {});
    if (diff.status === 2) {
      const tail = `${diff.stdout || ''}${diff.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-10).join('\n    ');
      errors.push(`schema.prisma has object(s) NOT created by the migration chain (drift) — a fresh deploy would be missing them; add a migration:\n    ${tail}`);
    } else if (diff.status !== 0) {
      const tail = `${diff.stdout || ''}${diff.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-6).join('\n    ');
      errors.push(`migrate diff (drift check) failed (exit ${diff.status}):\n    ${tail}`);
    } else {
      console.log(`  [live] no drift: schema.prisma is fully produced by the migration chain.`);
    }
  } finally {
    if (created) {
      const d = runProbe('.__mig_ddl.ts', PROBE_DDL, { HIRALENT_ADMIN_URL: adminUrl, HIRALENT_DDL_DB: THROWAWAY_DB, HIRALENT_DDL_ACTION: 'drop' }, 60000);
      if (!d.ok) console.error(`  [cleanup] WARNING: failed to drop throwaway DB ${THROWAWAY_DB}: ${d.error}`);
    }
  }
}

// ---- main --------------------------------------------------------------------
(async () => {
  const folderCount = staticChecks();
  await liveChecks(folderCount);

  if (errors.length) {
    console.error('\n✗ FAIL: migration chain is not proven fresh-deployable / config shape is wrong:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log(`\n✅ PASS: ${folderCount}-migration chain applies cleanly to an empty DB (proven live on a throwaway), schema.prisma has NO drift from the chain, one documented-harmless dup-label, no shadowDatabaseUrl (R-07), deploy migrate step defined (R-21). Primary DB untouched.`);
  process.exit(0);
})().catch((e) => {
  console.error(`\n✗ FAIL: verifier crashed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
