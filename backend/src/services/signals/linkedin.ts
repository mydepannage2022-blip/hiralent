export async function fetchLinkedInSnippet(link?: string | null): Promise<string> {
  if (!link) return '';
  // TODO: vrai fetch via API partenaire/outils internes
  return `Stub LinkedIn snippet for ${link}`;
}
