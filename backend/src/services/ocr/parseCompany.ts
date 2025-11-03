import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/fr";

dayjs.extend(customParseFormat);
dayjs.locale("fr");

export type ParsedCompany = {
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
  normalize: (s: string) =>
    s.replace(/\u00A0/g, " ")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/[|]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim(),
  deburr: (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
};

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

const DATE_FORMATS = [
  "DD/MM/YYYY","D/M/YYYY","DD-MM-YYYY","D-M-YYYY","YYYY-MM-DD",
  "DD.MM.YYYY","D.M.YYYY","D MMM YYYY","DD MMM YYYY","D MMMM YYYY","DD MMMM YYYY",
];

function extractCompanyName(lines: string[]): { value?: string; score: number; note?: string } {
  const normLines = lines.map((l) => CLEAN.normalize(l));

  // ✅ NEW: Look for explicit company name after hints
  for (let i = 0; i < normLines.length; i++) {
    const line = normLines[i];
    const hint = COMPANY_HINTS.find((r) => r.test(line));
    
    if (hint) {
      // Check same line after colon/separator
      const after = line.split(/[:：]/)[1] || "";
      const candidate = CLEAN.normalize(after)
        .split(/\b(RC|ICE|IF|PATENTE|TVA|VAT)\b/i)[0]
        .replace(/^[-–—]\s*/, "")
        .replace(/[^\w\s&''.-]/g, "")
        .trim();
      
      if (candidate && candidate.length >= 3) {
        return { value: candidate, score: 0.95, note: "from_hint_same_line" };
      }
      
      // ✅ Check next line after hint (common in structured documents)
      if (i + 1 < normLines.length) {
        const nextLine = normLines[i + 1].trim();
        if (nextLine.length >= 3 && nextLine.length < 100 && !/^\d+[\|\)]/.test(nextLine)) {
          return { value: nextLine, score: 0.93, note: "from_hint_next_line" };
        }
      }
    }
  }

  // ✅ NEW: In Moroccan documents, company name often appears prominently before first section
  const beforeFirstSection = [];
  for (let i = 0; i < Math.min(15, normLines.length); i++) {
    // Stop at first numbered section (1 |, 2 |, etc.)
    if (/^\d+[\|\)]/.test(normLines[i])) break;
    
    // Skip issuing authority names
    if (/(office|minist[eè]re|tribunal|administration|gouvernement)/i.test(normLines[i])) continue;
    
    // Skip generic headers
    if (/(fiche|certificat|document|legal|registre)/i.test(normLines[i])) continue;
    
    beforeFirstSection.push(normLines[i]);
  }
  
  // Find the most prominent looking company name
  const candidates = beforeFirstSection.filter(line => {
    const words = line.split(/\s+/);
    return line.length >= 5 
           && line.length < 80
           && words.length >= 2 
           && words.length <= 10
           && !/\d{4}/.test(line) // no years
           && !/@/.test(line); // no emails
  });
  
  if (candidates.length > 0) {
    // Pick the one that looks most like a company name (has uppercase, &, SARL, etc.)
    candidates.sort((a, b) => scoreTitleLike(b) - scoreTitleLike(a));
    if (candidates[0] && candidates[0].length >= 5) {
      return { value: candidates[0], score: 0.80, note: "prominent_before_sections" };
    }
  }

  // Original title-like logic as final fallback...
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

function extractRegistration(text: string) {
  const tests: Array<{ type: ParsedCompany["registration_number"]["type"]; re: RegExp; weight: number; }> = [
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
      return { value: { type: t.type, value: val }, score: Math.min(0.99, 0.6 + 0.4 * t.weight) };
    }
  }
  return { score: 0.1 };
}

function extractAddress(lines: string[]) {
  const norm = lines.map((l) => CLEAN.normalize(l));
  
  // First, look for "Siège social" with value on same line or after colon
  for (let i = 0; i < norm.length; i++) {
    if (/si[eè]ge\s+social/i.test(norm[i])) {
      const after = norm[i].split(/[:：]/)[1] || "";
      const v = CLEAN.normalize(after);
      if (v.length > 10) return { value: v, score: 0.9, note: "from_siege_social" };
    }
  }

  // Look for address hints followed by actual address content
  for (let i = 0; i < norm.length; i++) {
    const line = norm[i];
    
    // If we find an address hint/label
    if (ADDRESS_HINTS.some((r) => r.test(line))) {
      // Check if the line itself has content after the label
      const afterColon = line.split(/[:：]/)[1] || "";
      if (afterColon.length > 10 && looksLikeAddress(afterColon)) {
        return { value: CLEAN.normalize(afterColon), score: 0.9, note: "from_hint_same_line" };
      }

      // ✅ NEW: Skip table headers (short lines with multiple column names)
      const isTableHeader = /\b(adresse|activit[ée]|enseigne|ville|city|address)\b/gi.test(line) 
                          && line.split(/\s+/).length <= 5 
                          && line.length < 50;

      if (isTableHeader) {
        // Look at the next few lines for actual address data
        const collected: string[] = [];
        for (let j = i + 1; j < Math.min(i + 5, norm.length); j++) {
          const nextLine = norm[j];
          
          // Skip empty or very short lines
          if (nextLine.length < 5) continue;
          
          // Stop if we hit another section header
          if (/^\d+[\)|\|]/.test(nextLine)) break;
          
          // Collect lines that look like addresses
          if (looksLikeAddress(nextLine)) {
            collected.push(nextLine);
          } else if (collected.length > 0) {
            // If we already have some address lines and hit a non-address line, stop
            break;
          }
        }
        
        if (collected.length > 0) {
          const joined = CLEAN.normalize(collected.join(", "));
          return { value: joined, score: 0.88, note: "from_table_content" };
        }
      } else {
        // Original logic for non-table headers
        const collected = [stripLabel(line)];
        for (let j = i + 1; j < Math.min(i + 4, norm.length); j++) {
          if (looksLikeAddress(norm[j])) collected.push(norm[j]); 
          else break;
        }
        const joined = CLEAN.normalize(collected.filter(s => s.length > 3).join(", "));
        if (joined.length > 10) return { value: joined, score: 0.85, note: "from_hint_multiline" };
      }
    }
  }

  // Fallback: scan for address-like patterns anywhere
  let best: { value?: string; score: number } = { score: 0.1 };
  for (let i = 0; i < norm.length; i++) {
    if (looksLikeAddress(norm[i]) && norm[i].length > 15) {
      const collected = [norm[i]];
      for (let j = i + 1; j < Math.min(i + 3, norm.length); j++) {
        if (looksLikeAddress(norm[j]) && norm[j].length > 5) {
          collected.push(norm[j]);
        } else break;
      }
      const joined = CLEAN.normalize(collected.join(", "));
      const sc = scoreAddress(joined);
      if (sc > best.score) best = { value: joined, score: sc };
    }
  }
  
  return best;
}

// Update looksLikeAddress to be more specific
function looksLikeAddress(s: string) {
  const deb = CLEAN.deburr(s.toLowerCase());
  
  // ✅ Exclude table headers and labels
  const isLabel = /^(adresse|address|activit[ée]|enseigne|ville|city)(\s|$)/i.test(s.trim());
  if (isLabel) return false;
  
  const hasStreet = /(rue|avenue|av\.?|bd|boulevard|quartier|route|lot|bloc|immeuble|appartement|apartment|street|st\.?|road|rd\.?|hay|n°|num[ée]ro)/i.test(deb);
  const hasNum = /\b\d{1,5}\b/.test(deb);
  const hasPostCode = /\b\d{4,6}\b/.test(deb);
  const hasCityHint = /(casablanca|rabat|tanger|marrakech|fes|agadir|dakhla|ouad|oued|paris|marseille|lyon|london|madrid|city|ville|morocco|maroc|france|uk|espagne|spain)/i.test(deb);
  
  // Require at least one strong indicator
  return (hasStreet && hasNum) || (hasNum && hasCityHint) || (hasStreet && hasCityHint) || hasPostCode;
}

function stripLabel(s: string) {
  return CLEAN.normalize(s.replace(/^\s*(adresse|address|si[eè]ge\s+social)\s*[:：-]\s*/i, ""));
}

function scoreAddress(s: string) {
  let sc = 0.5;
  if (/\b\d{4,6}\b/.test(s)) sc += 0.15;
  if (/,/.test(s)) sc += 0.1;
  if (/(maroc|morocco|france|uk|city|ville|casablanca|rabat|tanger|marrakech)/i.test(s)) sc += 0.1;
  return Math.min(0.95, sc);
}

function extractDates(text: string, lines: string[]) {
  const iso: string[] = [];
  const pushed = new Set<string>();
  for (const line of lines) {
    if (DATE_CONTEXT.some((r) => r.test(line))) {
      const m = line.match(DATE_CANDIDATE);
      if (m) {
        const d = normalizeDate(m[1]);
        if (d && !pushed.has(d)) { iso.push(d); pushed.add(d); }
      }
    }
  }
  if (iso.length === 0) {
    const all = text.match(new RegExp(DATE_CANDIDATE, "gi")) || [];
    for (const raw of all) {
      const d = normalizeDate(raw);
      if (d && !pushed.has(d)) { iso.push(d); pushed.add(d); }
      if (iso.length >= 3) break;
    }
  }
  const score = iso.length === 0 ? 0.1 : (iso.length > 0 && hasContext(lines) ? 0.85 : 0.7);
  return { values: iso, score };
}
function normalizeDate(raw: string): string | null {
  const clean = CLEAN.normalize(raw.toLowerCase().replace(/^\w{3}\.\s*/, ""));
  const tryFormats = (locale: 'fr' | 'en') => {
    for (const fmt of DATE_FORMATS) {
      const d = dayjs(clean, fmt, locale, true);
      if (d.isValid()) return d.toDate().toISOString();
    }
    return null;
  };
  // try FR first, then EN
  return tryFormats('fr') || tryFormats('en') || (dayjs(clean).isValid() ? dayjs(clean).toDate().toISOString() : null);
}

function hasContext(lines: string[]) {
  return lines.some((l) => DATE_CONTEXT.some((r) => r.test(l)));
}

export function parseCompanyDoc(ocrText: string): ParsedCompany {
  const text = CLEAN.normalize(ocrText);
  const lines = text.split(/\r?\n/).map((l) => CLEAN.normalize(l)).filter(Boolean);

  const name = extractCompanyName(lines);
  const reg = extractRegistration(text);
  const addr = extractAddress(lines);
  const dates = extractDates(text, lines);

  return {
    company_name: name.value,
    registration_number: (reg as any).value,
    address: addr.value,
    issue_dates: dates.values,
    meta: {
      confidence: {
        company_name: name.score,
        registration_number: (reg as any).score ?? 0.1,
        address: addr.score,
        issue_dates: dates.score,
      },
      notes: [name.note ? `company_name:${name.note}` : undefined].filter(Boolean) as string[],
    },
  };
}
