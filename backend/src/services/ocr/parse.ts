// backend/src/services/ocr/parse.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/fr";

dayjs.extend(customParseFormat);
dayjs.locale("fr");

export type ParsedVerification = {
  company_name?: string;
  registration_number?: {
    type: "ICE" | "RC" | "IF" | "PATENTE" | "VAT" | "COMPANY_NO" | "UNKNOWN";
    value: string;
  };
  address?: string;
  issue_dates?: string[]; // ISO 8601
  meta: {
    confidence: {
      company_name: number;
      registration_number: number;
      address: number;
      issue_dates: number;
    };
    notes?: string[];
  };
};

const CLEAN = {
  // normalisation légère
  normalize: (s: string) =>
    s
      .replace(/\u00A0/g, " ")   // espace insécable
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/[|]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim(),
  // supprime accents pour matcher plus facilement certains mots-clés
  deburr: (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
};

// --- Heuristiques clés ---
const COMPANY_HINTS = [
  /raison\s*sociale/i,
  /d[’']entreprise/i,
  /dénomination\s+sociale/i,
  /company\s+name/i,
  /nom\s+de\s+la\s+societe/i,
  /nom\s+de\s+l'?entreprise/i,
  /^societe\s*:/i,
  /^entreprise\s*:/i,
];

const ADDRESS_HINTS = [
  /adresse/i,
  /si[eè]ge\s+social/i,
  /head\s*office/i,
  /address/i,
];

const REGEX = {
  ICE: /\b(?:ICE)\s*[:\-]?\s*(\d{15})\b/i,
  RC: /\b(?:RC|R\.C\.|Reg(?:istration)?\s*No\.?|Reg(?:istre)?\s+du\s+commerce)\s*[:\-]?\s*([A-Z0-9\/\-]{3,})\b/i,
  IF: /\b(?:IF|Identifiant\s+Fiscal)\s*[:\-]?\s*([A-Z0-9\/\-]{4,})\b/i,
  PATENTE: /\b(?:Patente)\s*[:\-]?\s*([A-Z0-9\/\-]{4,})\b/i,
  VAT: /\b(?:TVA|VAT|Num[eé]ro\s+de\s+TVA|VAT\s+Number)\s*[:\-]?\s*([A-Z0-9\-]{6,})\b/i,
  COMPANY_NO: /\b(?:Company\s*(?:No|Number)|Num[eé]ro\s+d['e]\s*entreprise)\s*[:\-]?\s*([A-Z0-9\-\/]{4,})\b/i,
};

// Dates FR/EN : 01/02/2023, 01-02-2023, 1 févr. 2023, 1 février 2023, 2023-02-01, etc.
const DATE_CANDIDATE =
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:\d{1,2}\s+(?:janv(?:ier)?|f[eé]vr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[eé]c(?:embre)?|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4}))\b/i;

const DATE_CONTEXT = [
  /date\s*d['e]\s*emission/i,
  /date\s*d['e]\s*d[eé]livrance/i,
  /date\s*d['e]\s*issue/i,
  /issued?\s*on/i,
  /date\s*d['e]\s*cr[eé]ation/i,
  /registration\s*date/i,
  /date\s*d['e]\s*publication/i,
];

// Formats tentés par dayjs
const DATE_FORMATS = [
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD-MM-YYYY",
  "D-M-YYYY",
  "YYYY-MM-DD",
  "DD.MM.YYYY",
  "D.M.YYYY",
  "D MMM YYYY",
  "DD MMM YYYY",
  "D MMMM YYYY",
  "DD MMMM YYYY",
];

// --- Extraction company name ---
// 1) Si une ligne commence par "Raison sociale: XXX" → prend XXX
// 2) Sinon, prends la meilleure ligne "title-like" (longueur 2-7 mots, majuscules, pas de code/numéro)
function extractCompanyName(lines: string[]): { value?: string; score: number; note?: string } {
  const normLines = lines.map((l) => CLEAN.normalize(l));

  // Hints directs (Raison sociale, Company name, etc.)
  for (const line of normLines) {
    const hint = COMPANY_HINTS.find((r) => r.test(line));
    if (hint) {
      const after = line.split(/[:：]/)[1] || "";
      const candidate = CLEAN.normalize(after)
        .replace(/^[-–—]\s*/, "")
        .replace(/[^\w\s&'’.-]/g, "");
      if (candidate && candidate.length >= 3) {
        return { value: candidate, score: 0.95, note: "from_hint" };
      }
    }
  }

  // Heuristique: ligne “titre”
  const titleish: string[] = [];
  for (let i = 0; i < Math.min(10, normLines.length); i++) {
    const l = normLines[i];
    const words = l.split(/\s+/);
    const hasDigits = /\d/.test(l);
    const hasLongWord = words.some((w) => w.length >= 3);
    if (!hasDigits && hasLongWord && words.length >= 2 && words.length <= 8) {
      titleish.push(l);
    }
  }
  if (titleish.length) {
    // privilégie les lignes en majuscules ou Capitalized
    titleish.sort((a, b) => scoreTitleLike(b) - scoreTitleLike(a));
    return { value: titleish[0], score: 0.75, note: "title_like" };
  }

  return { score: 0.1 };
}

function scoreTitleLike(s: string) {
  const upperRatio = s.replace(/[^A-Z]/g, "").length / Math.max(1, s.replace(/[^A-Za-z]/g, "").length);
  const hasAmp = /&|et/i.test(s);
  return (upperRatio > 0.6 ? 0.2 : 0) + (hasAmp ? 0.1 : 0) + Math.min(0.7, s.length / 60);
}

// --- Extraction registration number (ICE/RC/IF/Patente/VAT/Company No) ---
function extractRegistration(text: string) {
  const tests: Array<{
    type: ParsedVerification["registration_number"]["type"];
    re: RegExp;
    weight: number;
  }> = [
    { type: "ICE", re: REGEX.ICE, weight: 1.0 },
    { type: "RC", re: REGEX.RC, weight: 0.9 },
    { type: "IF", re: REGEX.IF, weight: 0.85 },
    { type: "PATENTE", re: REGEX.PATENTE, weight: 0.8 },
    { type: "VAT", re: REGEX.VAT, weight: 0.7 },
    { type: "COMPANY_NO", re: REGEX.COMPANY_NO, weight: 0.6 },
  ];

  for (const t of tests) {
    const m = text.match(t.re);
    if (m && m[1]) {
      const val = CLEAN.normalize(m[1]).replace(/[^\w\/\-]/g, "");
      return {
        value: { type: t.type, value: val },
        score: Math.min(0.99, 0.6 + 0.4 * t.weight),
      };
    }
  }
  return { score: 0.1 };
}

// --- Extraction address ---
// Stratégie :
// 1) Cherche une ligne contenant "Adresse", "Siège social", "Address"... et capture cette ligne + lignes suivantes jusqu'à ville/pays/code postal probable.
// 2) Sinon, heuristique: prend le plus long bloc de lignes contenant des marqueurs d’adresse (rue/avenue/bd, chiffres, code postal, ville/pays).
function extractAddress(lines: string[]) {
  const norm = lines.map((l) => CLEAN.normalize(l));

  // 1) hint
  for (let i = 0; i < norm.length; i++) {
    if (ADDRESS_HINTS.some((r) => r.test(norm[i]))) {
      const collected = [stripLabel(norm[i])];
      // prends 2-3 lignes suivantes si elles ressemblent à une adresse
      for (let j = i + 1; j < Math.min(i + 4, norm.length); j++) {
        if (looksLikeAddress(norm[j])) collected.push(norm[j]);
        else break;
      }
      const joined = CLEAN.normalize(collected.join(", "));
      if (joined.length > 8) return { value: joined, score: 0.85, note: "from_hint" };
    }
  }

  // 2) heuristique
  let best: { value?: string; score: number } = { score: 0.1 };
  for (let i = 0; i < norm.length; i++) {
    if (looksLikeAddress(norm[i])) {
      const collected = [norm[i]];
      for (let j = i + 1; j < Math.min(i + 4, norm.length); j++) {
        if (looksLikeAddress(norm[j])) collected.push(norm[j]); else break;
      }
      const joined = CLEAN.normalize(collected.join(", "));
      const sc = scoreAddress(joined);
      if (sc > best.score) best = { value: joined, score: sc };
    }
  }
  return best;
}

function stripLabel(s: string) {
  return CLEAN.normalize(s.replace(/^\s*(adresse|address|si[eè]ge\s+social)\s*[:：-]\s*/i, ""));
}

function looksLikeAddress(s: string) {
  const deb = CLEAN.deburr(s.toLowerCase());
  const hasStreet = /(rue|avenue|av\.?|bd|boulevard|quartier|route|lot|bloc|immeuble|appartement|apartment|street|st\.?|road|rd\.?)/i.test(deb);
  const hasNum = /\b\d{1,5}\b/.test(deb);
  const hasPostCode = /\b\d{4,6}\b/.test(deb);
  const hasCityHint = /(casablanca|rabat|tanger|marrakech|fes|agadir|paris|marseille|lyon|london|madrid|city|ville|morocco|maroc|france|uk|espagne|spain)/i.test(deb);
  return hasStreet || (hasNum && (hasCityHint || hasPostCode));
}

function scoreAddress(s: string) {
  let sc = 0.5;
  if (/\b\d{4,6}\b/.test(s)) sc += 0.15;
  if (/,/.test(s)) sc += 0.1;
  if (/(maroc|morocco|france|uk|city|ville|casablanca|rabat|tanger|marrakech)/i.test(s)) sc += 0.1;
  return Math.min(0.95, sc);
}

// --- Extraction dates ---
// On essaie: dates proches de mots-clés (issue/emission/creation)
function extractDates(text: string, lines: string[]) {
  const iso: string[] = [];
  const pushed = new Set<string>();

  // 1) Contexte fort (ligne avec mot-clé)
  for (const line of lines) {
    if (DATE_CONTEXT.some((r) => r.test(line))) {
      const m = line.match(DATE_CANDIDATE);
      if (m) {
        const d = normalizeDate(m[1]);
        if (d && !pushed.has(d)) {
          iso.push(d);
          pushed.add(d);
        }
      }
    }
  }

  // 2) Global (si rien trouvé)
  if (iso.length === 0) {
    const all = text.match(new RegExp(DATE_CANDIDATE, "gi")) || [];
    for (const raw of all) {
      const d = normalizeDate(raw);
      if (d && !pushed.has(d)) {
        iso.push(d);
        pushed.add(d);
      }
      if (iso.length >= 3) break; // limite
    }
  }

  // Score simple: 0 si rien, 0.7 si trouvé, 0.85 si trouvé avec contexte
  const score = iso.length === 0 ? 0.1 : (iso.length > 0 && hasContext(lines) ? 0.85 : 0.7);
  return { values: iso, score };
}

function normalizeDate(raw: string): string | null {
  const clean = CLEAN.normalize(raw.toLowerCase().replace(/^\w{3}\.\s*/, "")); // enlève "lun." éventuel
  for (const fmt of DATE_FORMATS) {
    const d = dayjs(clean, fmt, "fr", true);
    if (d.isValid()) return d.toDate().toISOString();
  }
  // Essai parsing libre (moins strict)
  const loose = dayjs(clean);
  return loose.isValid() ? loose.toDate().toISOString() : null;
}
function hasContext(lines: string[]) {
  return lines.some((l) => DATE_CONTEXT.some((r) => r.test(l)));
}

// --- API principale ---
export function parseOCRToStructured(ocrText: string): ParsedVerification {
  const text = CLEAN.normalize(ocrText);
  const lines = text.split(/\r?\n/).map((l) => CLEAN.normalize(l)).filter(Boolean);

  // 1) Nom
  const name = extractCompanyName(lines);

  // 2) Numéro d’enregistrement
  const reg = extractRegistration(text);

  // 3) Adresse
  const addr = extractAddress(lines);

  // 4) Dates
  const dates = extractDates(text, lines);

  return {
    company_name: name.value,
    registration_number: reg.value,
    address: addr.value,
    issue_dates: dates.values,
    meta: {
      confidence: {
        company_name: name.score,
        registration_number: reg.score,
        address: addr.score,
        issue_dates: dates.score,
      },
      notes: [
        name.note ? `company_name:${name.note}` : undefined,
      ].filter(Boolean) as string[],
    },
  };
}
