#!/usr/bin/env node
/**
 * verify-db-pool-config.mjs — Wave 2 / Session 2 (Phase 2.1, R-06b)
 *
 * Static/offline gate for the connection-pooling CONFIG SHAPE. It does NOT talk to
 * Postgres — the live pool-bound proof lives in `verify-connection-pool.mjs`. Here we
 * lock the config so the bound can't silently regress:
 *
 *   1. schema.prisma datasource declares BOTH `url = env("DATABASE_URL")` (pooled runtime
 *      path) AND `directUrl = env("DIRECT_DATABASE_URL")` (direct migrate path).
 *   2. backend/.env.example's REAL DATABASE_URL assignment carries `connection_limit=` and
 *      `pool_timeout=` (the bound + queue wait).
 *   3. backend/.env.example declares DIRECT_DATABASE_URL, and its value carries NO
 *      `pgbouncer` param (migrations must hit Postgres directly, bypassing the pooler).
 *   4. env-var-matrix.md documents DIRECT_DATABASE_URL.
 *   5. root docker-compose.yml defines a `pgbouncer` service (image + transaction POOL_MODE
 *      + port 6432) — the PgBouncer front is at least DEFINED (full wiring = Wave 8).
 *   6. The RUNTIME guard is wired: server.ts imports and calls assertDbPoolConfig(), and
 *      requireEnv.ts's assertDbPoolConfig actually inspects the live DATABASE_URL for a
 *      connection_limit (fatal in production). This closes the gap where the pool bound was
 *      only ever proven against the .env.example template, not the string the server boots
 *      with — a bare provider URL in prod would otherwise default Prisma to an unbounded pool
 *      while this gate stayed green.
 *
 * Exit 0 => config shape holds. Exit 1 => prints every problem.
 * Deterministic. Node built-ins only. Windows-safe (no shell). Only parses uncommented
 * assignment lines so example/comment lines (e.g. the Wave-8 pgbouncer=true sample) never
 * trip the checks.
 *
 * Usage: node hiralent-master-plan/tools/verify-db-pool-config.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const SCHEMA = path.join(ROOT, 'backend', 'prisma', 'schema.prisma');
const ENV_EXAMPLE = path.join(ROOT, 'backend', '.env.example');
const MATRIX = path.join(ROOT, 'hiralent-master-plan', 'matrices', 'env-var-matrix.md');
const COMPOSE = path.join(ROOT, 'docker-compose.yml');

const errors = [];
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

/** Return the RHS value of the last uncommented `KEY=...` assignment, or null. */
function envValue(txt, key) {
  if (txt == null) return null;
  let val = null;
  const re = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`);
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*#/.test(line)) continue; // skip comment lines
    const m = line.match(re);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      val = v;
    }
  }
  return val;
}

// ---- 1. schema datasource ---------------------------------------------------
const schema = read(SCHEMA);
if (schema == null) {
  errors.push(`schema.prisma not found at ${path.relative(ROOT, SCHEMA)}`);
} else {
  const ds = (schema.match(/datasource\s+\w+\s*\{[\s\S]*?\}/) || [''])[0];
  if (!/\burl\s*=\s*env\(\s*["']DATABASE_URL["']\s*\)/.test(ds)) {
    errors.push('schema.prisma datasource must set url = env("DATABASE_URL").');
  }
  if (!/\bdirectUrl\s*=\s*env\(\s*["']DIRECT_DATABASE_URL["']\s*\)/.test(ds)) {
    errors.push('schema.prisma datasource must set directUrl = env("DIRECT_DATABASE_URL") (direct migrate path, PgBouncer bypass).');
  }
}

// ---- 2 & 3. .env.example pool params + direct url ---------------------------
const envEx = read(ENV_EXAMPLE);
if (envEx == null) {
  errors.push(`backend/.env.example not found`);
} else {
  const dbUrl = envValue(envEx, 'DATABASE_URL');
  if (dbUrl == null) {
    errors.push('backend/.env.example must define DATABASE_URL.');
  } else {
    if (!/[?&]connection_limit=[1-9]\d*/.test(dbUrl)) errors.push('backend/.env.example DATABASE_URL must carry a connection_limit= param >= 1 (bounds the pool, R-06).');
    if (!/[?&]pool_timeout=\d+/.test(dbUrl)) errors.push('backend/.env.example DATABASE_URL must carry a pool_timeout= param.');
  }
  const directUrl = envValue(envEx, 'DIRECT_DATABASE_URL');
  if (directUrl == null) {
    errors.push('backend/.env.example must define DIRECT_DATABASE_URL (direct migrate path).');
  } else if (/pgbouncer/i.test(directUrl)) {
    errors.push('backend/.env.example DIRECT_DATABASE_URL must NOT use pgbouncer — it is the DIRECT path migrations use to bypass the pooler.');
  }
}

// ---- 4. matrix documents DIRECT_DATABASE_URL --------------------------------
const matrix = read(MATRIX);
if (matrix == null) errors.push('env-var-matrix.md not found');
else if (!/\bDIRECT_DATABASE_URL\b/.test(matrix)) errors.push('env-var-matrix.md must document DIRECT_DATABASE_URL.');

// ---- 5. compose defines a pgbouncer service ---------------------------------
const compose = read(COMPOSE);
if (compose == null) {
  errors.push('root docker-compose.yml not found');
} else {
  if (!/^\s{2}pgbouncer\s*:/m.test(compose)) errors.push('docker-compose.yml must define a `pgbouncer` service (R-06, Wave 2).');
  if (!/image\s*:\s*\S*pgbouncer/i.test(compose)) errors.push('docker-compose.yml pgbouncer service must use a pgbouncer image.');
  if (!/POOL_MODE\s*:\s*["']?transaction/i.test(compose)) errors.push('docker-compose.yml pgbouncer must use POOL_MODE: transaction (transaction pooling).');
  if (!/6432/.test(compose)) errors.push('docker-compose.yml pgbouncer must expose/listen on 6432.');
}

// ---- 6. runtime guard is wired ----------------------------------------------
const requireEnvTxt = read(path.join(ROOT, 'backend', 'src', 'config', 'requireEnv.ts'));
if (requireEnvTxt == null) {
  errors.push('backend/src/config/requireEnv.ts not found');
} else {
  if (!/export\s+function\s+assertDbPoolConfig\s*\(/.test(requireEnvTxt)) {
    errors.push('requireEnv.ts must export assertDbPoolConfig() — the runtime DATABASE_URL pool guard (R-06).');
  }
  // It must actually read the live URL and look for connection_limit, and be fatal in prod.
  if (!/process\.env\.DATABASE_URL/.test(requireEnvTxt) || !/connection_limit/.test(requireEnvTxt)) {
    errors.push('assertDbPoolConfig must inspect process.env.DATABASE_URL for connection_limit (not just the .env.example).');
  }
  if (!/NODE_ENV\s*===\s*['"]production['"]/.test(requireEnvTxt) || !/throw new Error/.test(requireEnvTxt)) {
    errors.push('assertDbPoolConfig must throw (fail fast) in production when connection_limit is missing.');
  }
}

const serverTxt = read(path.join(ROOT, 'backend', 'src', 'server.ts'));
if (serverTxt == null) {
  errors.push('backend/src/server.ts not found');
} else {
  if (!/assertDbPoolConfig\s*\(\s*\)/.test(serverTxt)) {
    errors.push('server.ts must CALL assertDbPoolConfig() at boot (after dotenv.config) — otherwise the runtime pool guard never runs.');
  }
}

// ---- report -----------------------------------------------------------------
if (errors.length) {
  console.error('\n✗ FAIL: DB pool/direct-url config shape is wrong:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} problem(s). Fix the config above and re-run.`);
  process.exit(1);
}

console.log('✅ PASS: pool config shape holds — schema directUrl, bounded DATABASE_URL params, direct DIRECT_DATABASE_URL, matrix documented, pgbouncer service defined, runtime guard wired (server.ts → assertDbPoolConfig inspects the live URL, fatal in prod).');
process.exit(0);
