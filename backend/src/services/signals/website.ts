export async function fetchWebsiteText(url?: string | null): Promise<string> {
  if (!url) return '';
  // TODO: remplacer par un vrai scraper (cheerio/playwright)
  return `Stub website text for ${url}`;
}
