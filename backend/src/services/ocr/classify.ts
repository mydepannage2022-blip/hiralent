export type DocType = 'cv' | 'company_doc';

const CV_HINTS = [
  // Sections (FR/EN)
  /\b(comp[ée]tence|skills?)\b/i,
  /\b(formation|education|dipl[oô]me|degree)\b/i,
  /\b(exp[ée]riences?|work\s+experience|employment|projects?)\b/i,
  /\b(langues?|languages?)\b/i,
  // Contact / portfolio
  /\blinkedin\.com\b/i,
  /\bgithub\.com\b/i,
  /\bportfolio\b/i,
  // CV titles
  /\b(curriculum\s*vit[aeé]|resume)\b/i,
];

const COMPANY_HINTS = [
  // Very specific corporate markers (FR/EN) — keep these tight
  /\braison\s*sociale\b/i,
  /\bd[’']?entreprise\b/i,
  /\bd[ée]nomination\s+sociale\b/i,
  /\bcompany\s+name\b/i,
  /\bICE\b/i,
  /\bR\.?C\.?\b|\bReg(?:istre)?\s+du\s+commerce\b/i,
  /\bIdentifiant\s+Fiscal\b|\bIF\b/i,
  /\bPatente\b/i,
  /\bVAT\b|\bTVA\b/i,
  // Address marker but strong corporate ones only
  /\bsi[eè]ge\s+social\b/i,
  // Issuance/context lines typical for certificates
  /\b(date\s+d['eé]mission|date\s+d['eé]livrance|issued\s+on|registration\s+date|date\s+de\s+publication)\b/i,
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+\d{1,3}\s*)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{2,3}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/;

export function classifyDocType(text: string): DocType {
  const t = (text || '').slice(0, 40000);

  // base scores from regex hits
  const cvBase = CV_HINTS.reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);
  const companyBase = COMPANY_HINTS.reduce((s, r) => s + (r.test(t) ? 1 : 0), 0);

  // light features: CVs usually show contact + multiple sections
  const hasEmail = EMAIL_RE.test(t);
  const hasPhone = PHONE_RE.test(t);
  const cvSections =
    (/\b(comp[ée]tence|skills?)\b/i.test(t) ? 1 : 0) +
    (/\b(formation|education|dipl[oô]me|degree)\b/i.test(t) ? 1 : 0) +
    (/\b(exp[ée]riences?|work\s+experience|employment|projects?)\b/i.test(t) ? 1 : 0);

  // boost CV if it looks like a resume header with contact + >=2 sections
  let cvScore = cvBase + (hasEmail ? 1 : 0) + (hasPhone ? 0.5 : 0) + (cvSections >= 2 ? 1 : 0);

  // tighten company: require at least one hard corporate ID (ICE/RC/IF/VAT/Patente) OR “raison sociale”
  const hasHardCorporateId = /\b(ICE|R\.?C\.?|Identifiant\s+Fiscal|IF|Patente|VAT|TVA)\b/i.test(t);
  const hasRaisonSociale = /\braison\s*sociale\b/i.test(t);
  let companyScore = companyBase + (hasHardCorporateId ? 2 : 0) + (hasRaisonSociale ? 1 : 0);

  // final decision with margin
  if (companyScore >= cvScore + 1 && (hasHardCorporateId || hasRaisonSociale)) return 'company_doc';
  if (cvScore >= companyScore) return 'cv';

  // fallback: if still unsure, prefer CV (safer for user uploads)
  return 'cv';
}
