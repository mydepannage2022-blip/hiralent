export type ParsedCV = {
  person?: {
    full_name?: string;
    emails?: string[];
    phones?: string[];
    links?: string[]; // linkedin, github, portfolio
    languages?: string[]; // langues parlées
  };
  skills?: string[];               // compétences
  education?: Array<{
    school?: string;
    degree?: string;
    period?: string;               // ex: "2021-2023"
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    period?: string;               // ex: "07/2024 – 08/2024"
    bullets?: string[];            // points (missions)
  }>;
  meta: {
    confidence: {
      full_name: number;
      skills: number;
      education: number;
      experience: number;
    };
    notes?: string[];
  };
};

const CLEAN = {
  normalize: (s: string) =>
    (s || '')
      .replace(/\u00A0/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const PHONE_RE = /(?:\+\d{1,3}\s*)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{2,3}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g;
const LINK_RE = /\b(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com|portfolio|behance\.net|dribbble\.com)\/[A-Za-z0-9._\-\/]+/ig;

const SECTION_HINTS = {
  skills: /(comp[ée]tences|skills)/i,
  education: /(formation|education|dipl[oô]me)/i,
  experience: /(exp[ée]riences?|work\s+experience|employment)/i,
  languages: /(langues?|languages?)/i,
};

export function parseCV(ocrText: string): ParsedCV {
  const text = CLEAN.normalize(ocrText);
  const lines = text.split(/\r?\n/).map(CLEAN.normalize).filter(Boolean);

  // Emails / phones / links
  const emails = Array.from(new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase())));
  const phones = Array.from(new Set((text.match(PHONE_RE) || []).map(CLEAN.normalize)));
  const links = Array.from(new Set((text.match(LINK_RE) || []).map(CLEAN.normalize)));

  // Nom (heuristique simple : premières lignes “title-like” sans email/tel)
  let fullName: string | undefined;
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i];
    if (EMAIL_RE.test(l) || PHONE_RE.test(l)) continue;
    const words = l.split(/\s+/);
    const hasDigits = /\d/.test(l);
    if (!hasDigits && words.length >= 2 && words.length <= 6) {
      // beaucoup de CV ont un nom en majuscules ou Capitalized
      fullName = l.replace(/[,:;()]/g, '').trim();
      break;
    }
  }

  // Découpage par sections (très light, greedy)
  const idx = {
    skills: lines.findIndex(l => SECTION_HINTS.skills.test(l)),
    education: lines.findIndex(l => SECTION_HINTS.education.test(l)),
    experience: lines.findIndex(l => SECTION_HINTS.experience.test(l)),
    languages: lines.findIndex(l => SECTION_HINTS.languages.test(l)),
  };

  const getBlock = (start: number, nexts: number[]) => {
    const stops = nexts.filter(n => n > start).sort((a, b) => a - b);
    const end = (stops[0] ?? lines.length);
    return lines.slice(start + 1, end); // sauter le titre de section
  };

  let skills: string[] = [];
  if (idx.skills >= 0) {
    const block = getBlock(idx.skills, [idx.education, idx.experience, idx.languages]);
    const joined = block.join(' ');
    // split par virgules/points/puces
    skills = joined.split(/[,•;·\-\n]+/).map(s => s.trim()).filter(s => s.length >= 2).slice(0, 50);
  }

  let education: ParsedCV['education'] = [];
  if (idx.education >= 0) {
    const block = getBlock(idx.education, [idx.experience, idx.skills, idx.languages]);
    // heuristique: lignes contenant école/diplôme/période
    const bucket: string[] = [];
    for (const l of block) {
      if (/[\d]{4}\s*[-–]\s*[\d]{4}|\b20\d{2}\b/.test(l) || /(\bENSAM\b|universit[eé]|school|lyc[ée]e|iut|ensias|insa)/i.test(l)) {
        bucket.push(l);
      }
    }
    if (bucket.length) {
      education = [{
        school: bucket.find(l => /(ENSAM|universit[eé]|school|lyc[ée]e|iut|ensias|insa)/i.test(l)),
        degree: bucket.find(l => /(licence|master|ing[ée]nieur|bachelor|m1|m2|phd|doctorat)/i.test(l)),
        period: bucket.find(l => /[\d]{4}\s*[-–]\s*[\d]{4}|\b20\d{2}\b/.test(l)),
      }];
    }
  }

  let experience: ParsedCV['experience'] = [];
  if (idx.experience >= 0) {
    const block = getBlock(idx.experience, [idx.education, idx.skills, idx.languages]);
    // naïf: split par blancs + puces
    const bullets = block.join('\n').split(/\n?\s*[•\-–]\s+/).map(CLEAN.normalize).filter(Boolean);
    // Extraire titre + entreprise + période si présents dans la 1ère/2e puce
    const head = block.slice(0, 3).join(' ');
    const period = head.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–]\s*(\d{2}\/\d{4}|\d{4}|present|aujourd'hui)\b/i)?.[0];
    experience = [{
      title: head.match(/\b(developer|d[eé]veloppeur|data\s*scientist|engineer|analyst|stagiaire)\b/i)?.[0],
      company: head.match(/\b(inwi|orange|jaanga|arakea|capgemini|atos|ibm|sqli|accenture)\b/i)?.[0],
      period: period || undefined,
      bullets: bullets.slice(0, 8),
    }];
  }

  let languages: string[] = [];
  if (idx.languages >= 0) {
    const block = getBlock(idx.languages, [idx.education, idx.experience, idx.skills]);
    languages = block.join(' ').split(/[,;•\-\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
  }

  return {
    person: {
      full_name: fullName,
      emails,
      phones,
      links,
      languages,
    },
    skills,
    education,
    experience,
    meta: {
      confidence: {
        full_name: fullName ? 0.8 : 0.3,
        skills: skills.length ? 0.8 : 0.3,
        education: education.length ? 0.75 : 0.3,
        experience: experience.length ? 0.75 : 0.3,
      },
      notes: [],
    },
  };
}
