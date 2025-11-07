export async function fetchDomainAgeMonths(url?: string | null): Promise<number | null> {
  if (!url) return null;
  // TODO: whois réel → calcul âge du domaine en mois
  return 18; // stub
}
