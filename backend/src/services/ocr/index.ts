import { ocrFromFile } from './engine';
import { classifyDocType, DocType } from './classify';
import { parseCompanyDoc, ParsedCompany } from './parseCompany';
import { parseCV, ParsedCV } from './parseCV';

export type ParsedAny = {
  type: DocType;
  data: ParsedCompany | ParsedCV | null;
};

export async function ocrAndParse(filePath: string, declaredMime?: string, forceType?: DocType): Promise<{
  type: DocType;
  ocrText: string;
  parsed: ParsedCompany | ParsedCV | null;
}> {
  const text = await ocrFromFile(filePath, declaredMime);

  // Détection auto si non forcé
  const type: DocType = forceType ?? classifyDocType(text);

  let parsed: ParsedCompany | ParsedCV | null = null;
  if (type === 'company_doc') parsed = parseCompanyDoc(text);
  else if (type === 'cv') parsed = parseCV(text);

  return { type, ocrText: text, parsed };
}
