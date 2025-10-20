const SUPPORTED = new Set(['en', 'ar', 'fr']);

export function normalizeLang(input?: string | null): 'en' | 'ar' | 'fr' {
  const c = (input || '').toLowerCase().slice(0, 2);
  if (SUPPORTED.has(c)) return c as any;
  return 'en';
}
