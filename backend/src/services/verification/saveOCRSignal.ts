// backend/src/services/verification/saveOCRSignal.ts
import  prisma  from '../../lib/prisma';

type ParsedCompany = {
  company_name?: string;
  registration_number?: { type: string; value: string };
  address?: string;
  issue_dates?: string[];
  meta: { confidence: any; notes?: string[] };
};

type ExpectedProfile = {
  company_name?: string | null;
  registration_number?: string | null;
  address?: string | null;
};

function similarity(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const A = a.toLowerCase().replace(/\s+/g, ' ').trim();
  const B = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!A || !B) return 0;
  if (A === B) return 1;

  // very simple bag-of-words ratio
  const as = new Set(A.split(' '));
  const bs = new Set(B.split(' '));
  let inter = 0;
  as.forEach(w => { if (bs.has(w)) inter++; });
  return inter / Math.max(as.size, bs.size);
}

function computeScore(parsed: ParsedCompany, expected?: ExpectedProfile) {
  if (!expected) return 0.5; // neutral if we don't know expected
  const s1 = similarity(parsed.company_name, expected.company_name);
  const s2 = similarity(parsed.registration_number?.value, expected.registration_number);
  const s3 = similarity(parsed.address, expected.address);
  // weighted
  return Math.min(0.99, 0.5 * s2 + 0.3 * s1 + 0.2 * s3);
}

export async function saveOCRSignal(opts: {
  runId: string;
  ocrText: string;
  parsed: ParsedCompany;
  expected?: ExpectedProfile; // optional
}) {
  const { runId, ocrText, parsed, expected } = opts;

  const score = computeScore(parsed, expected);
  const passed = score >= 0.75;

  const payload = {
    parsed,
    expected,
    ocrText,
    scoring: {
      score,
      rules: '0.5*reg + 0.3*name + 0.2*address',
    },
  };

  console.log('[saveOCRSignal] runId=', runId, 'score=', score, 'passed=', passed);

  const signal = await prisma.verificationSignal.create({
    data: {
      run_id: runId,
      signal_type: 'doc_ocr_match',
      passed,
      score,
      explanation: passed
        ? 'OCR parsed data matches expected profile (threshold 0.75).'
        : 'OCR parsed data does not match expected profile.',
      raw_payload: payload as any,
    },
  });

  return signal;
}
