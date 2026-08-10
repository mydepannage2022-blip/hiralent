// backend/src/__tests__/s3-fetch.probe.ts
//
// Wave 4 / Session 3 — proof that verification/helpers/file.ts fetches real objects.
// The local-dev branch (uploads/ or absolute path) is proven ALWAYS. The S3 branch is
// proven when MinIO/S3 is reachable; otherwise it is skip-with-note, but we still prove the
// old `throw "not implemented"` stub is GONE (a real S3 miss/conn-error is NOT that string).
//
// Run: npx tsx src/__tests__/s3-fetch.probe.ts

import fs from "fs";
import path from "path";
import net from "net";
import { getFileBufferFromS3OrLocal } from "../services/verification/helpers/file";
import { s3PutObject } from "../lib/s3";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

function endpointReachable(endpoint: string): Promise<boolean> {
  return new Promise((resolve) => {
    let url: URL;
    try { url = new URL(endpoint); } catch { return resolve(false); }
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    const sock = net.connect({ host: url.hostname, port, timeout: 1500 });
    sock.on("connect", () => { sock.destroy(); resolve(true); });
    sock.on("timeout", () => { sock.destroy(); resolve(false); });
    sock.on("error", () => resolve(false));
  });
}

async function main() {
  // ---- Local-dev branch (always) ----
  // file.ts treats an `uploads/`-prefixed key (or a unix-absolute path) as a local read.
  const relKey = `uploads/s3probe-${Date.now()}.bin`;
  const abs = path.join(process.cwd(), relKey);
  const payload = Buffer.from("hiralent-local-branch-éè-bytes");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, payload);
  try {
    const buf = await getFileBufferFromS3OrLocal(relKey); // uploads/ ⇒ local read
    check("local (uploads/ path) branch returns identical bytes", buf.equals(payload));
  } finally {
    try { fs.unlinkSync(abs); } catch {}
  }

  // ---- Path-traversal containment (Wave 4 review, F2) ----
  // A local-looking key that escapes the uploads root must be REFUSED, never read. Removing
  // the containment guard in file.ts makes these fail (they would read the host file instead).
  for (const evil of ["uploads/../../../../etc/passwd", "/etc/passwd", "uploads/../.env"]) {
    let refused = false;
    try {
      await getFileBufferFromS3OrLocal(evil);
    } catch (e: any) {
      refused = /outside the uploads root/i.test(String(e?.message || e));
    }
    check(`traversal key refused: ${evil}`, refused);
  }

  // ---- S3 branch ----
  const endpoint = process.env.S3_ENDPOINT || "";
  const reachable = endpoint ? await endpointReachable(endpoint) : false;
  if (!reachable) {
    console.log(`  note: S3/MinIO not reachable at "${endpoint || "(unset)"}" — S3 round-trip SKIPPED.`);
    // Even without MinIO, prove the "not implemented" stub is gone: an S3-style key must
    // attempt a real fetch (and fail with a connection/NoSuchKey error), never the old throw.
    let msg = "";
    try {
      await getFileBufferFromS3OrLocal(`probe/nonexistent-${Date.now()}.bin`);
    } catch (e: any) {
      msg = String(e?.message || e);
    }
    check("S3 branch no longer throws 'not implemented' stub", !/not implemented/i.test(msg));
  } else {
    const key = `verification-probe/${Date.now()}.bin`;
    const s3payload = Buffer.from("hiralent-s3-roundtrip-bytes-ñ");
    await s3PutObject(key, s3payload, "application/octet-stream");
    const got = await getFileBufferFromS3OrLocal(key); // bare key ⇒ S3 branch
    check("S3 round-trip returns identical bytes", got.equals(s3payload));
  }

  if (failures) { console.error(`\ns3-fetch.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("\ns3-fetch.probe OK.");
}

main().catch((e) => { console.error(e); process.exit(1); });
