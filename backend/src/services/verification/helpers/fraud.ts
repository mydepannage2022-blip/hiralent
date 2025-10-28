// backend/src/services/verification/helpers/fraud.ts
export function runFraudHeuristics({ meta, parsed, digest }: any) {
  const reasons: string[] = [];
  let score = 1.0;

  // 1) duplicate hash (reuse when you add a doc-hash index)
  // if (await isKnownBadHash(digest)) { score = 0; reasons.push("Known bad document hash"); }

  // 2) metadata flags bubbling from pdfMeta
  if (!meta.passed) {
    score = Math.min(score, meta.score);
    reasons.push("PDF metadata flags present");
  }

  // 3) basic content sanity
  if (parsed?.registration_number && !/^[A-Za-z0-9\-\/ ]{4,}$/.test(parsed.registration_number)) {
    score -= 0.2; reasons.push("Registration number format looks off");
  }

  return {
    passed: score >= 0.6,
    score: Math.max(0, Math.min(1, score)),
    explanation: reasons.length ? reasons.join("; ") : "No fraud indicators detected",
    raw: { digest, parsed }
  };
}
