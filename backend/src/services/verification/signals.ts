import { PrismaClient } from "@prisma/client";

export type CompanyProfileExpected = {
  // Ce que tu t’attends à trouver (ex: profil en DB, ou données envoyées par le front)
  company_name?: string;
  registration_number?: string; // valeur brute (ex: ICE, RC…)
  address?: string;
};

export type ParsedCompany = {
  company_name?: string;
  registration_number?: { type: string; value: string };
  address?: string;
  issue_dates?: string[];
  meta?: any;
};

// --------- helpers de normalisation & similarité ----------
function normalize(s?: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9\s]/g, " ")    // enlève ponctuation
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Similarité très simple (token overlap). Rapide et suffisant ici.
function tokenSimilarity(a?: string, b?: string): number {
  const A = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const B = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size); // [0..1]
}

// Exact-ish pour numéros d’enreg. (on tolère quelques séparateurs)
function regEquals(a?: string, b?: string): boolean {
  const na = (a || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const nb = (b || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// --------- scoring du match OCR vs profil attendu ----------
function computeDocMatchScore(
  parsed: ParsedCompany,
  expected?: CompanyProfileExpected
): { score: number; passed: boolean; explanation: string } {
  if (!expected) {
    return {
      score: 0.5,
      passed: true,
      explanation: "Pas de profil attendu fourni; OCR stocké pour référence",
    };
  }

  // Pondérations (tu peux les ajuster)
  const W_NAME = 0.4;
  const W_REG  = 0.4;
  const W_ADDR = 0.2;

  // NAME
  const nameSim = tokenSimilarity(parsed.company_name, expected.company_name); // 0..1

  // REG
  let regOk = 0;
  if (parsed.registration_number?.value && expected.registration_number) {
    regOk = regEquals(parsed.registration_number.value, expected.registration_number) ? 1 : 0;
  }

  // ADDRESS
  const addrSim = tokenSimilarity(parsed.address, expected.address);

  const score = +(W_NAME * nameSim + W_REG * regOk + W_ADDR * addrSim).toFixed(2);

  // Règle simple: passed si score >= 0.70
  const passed = score >= 0.7;

  const parts = [
    `nameSim=${nameSim.toFixed(2)}`,
    `regMatch=${regOk}`,
    `addrSim=${addrSim.toFixed(2)}`,
    `weights(name=${W_NAME},reg=${W_REG},addr=${W_ADDR})`,
  ];

  return {
    score,
    passed,
    explanation: `Match calculé: ${parts.join(" | ")}`,
  };
}

// --------- création du VerificationSignal ----------
export async function saveDocOCRSignal(opts: {
  prisma: PrismaClient;
  runId: string;
  ocrText: string;
  parsed: ParsedCompany;                // résultat de ton parseur
  expected?: CompanyProfileExpected;    // profil attendu (optionnel)
}) {
  const { prisma, runId, ocrText, parsed, expected } = opts;

  const { score, passed, explanation } = computeDocMatchScore(parsed, expected);

  const signal = await prisma.verificationSignal.create({
    data: {
      run_id: runId,
      signal_type: "doc_ocr_match",
      passed,
      score,
      explanation,
      raw_payload: {
        ocrText,         // brut pour debug
        parsed,          // JSON structuré extrait
        expected,        // profil comparé (si fourni)
      },
    },
  });

  return signal;
}
