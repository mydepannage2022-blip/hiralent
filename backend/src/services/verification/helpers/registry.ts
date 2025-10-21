// backend/src/services/verification/helpers/registry.ts
export type RegistryResult = {
  passed: boolean;
  score: number;
  explanation: string;
  raw: any;
};

export async function validateWithRegistry({ parsed, expected }: any): Promise<RegistryResult> {
  // pick a country from parsed.address or expected.headquarters
  const country = detectCountry(parsed, expected);

  // call the right adapter (examples are placeholders)
  let data: any = null, source = "none";
  try {
    if (country === "MA") { // Morocco
      data = await registryMA(parsed.registration_number, parsed.company_name);
      source = "Morocco-registry";
    } else if (country === "GB") {
      data = await companiesHouseLookup(parsed.registration_number, parsed.company_name);
      source = "UK-CompaniesHouse";
    } else {
      return { passed: false, score: 0.5, explanation: "No registry adapter for country", raw: { country } };
    }
  } catch (e:any) {
    return { passed: false, score: 0.5, explanation: "Registry lookup failed", raw: { country, error: e.message } };
  }

  // scoring: name + reg no match
  let m = 0, total = 0;
  if (data?.registration_number && parsed?.registration_number) { total++; if (eq(data.registration_number, parsed.registration_number)) m++; }
  if (data?.company_name && parsed?.company_name)         { total++; if (eq(data.company_name, parsed.company_name)) m++; }
  const score = total ? m/total : 0.5;
  const passed = score >= 0.7;

  return { passed, score, explanation: `Registry ${source} matched ${m}/${total}`, raw: { source, data } };
}

function detectCountry(parsed:any, expected:any) {
  const t = (expected?.headquarters || parsed?.address || "").toLowerCase();
  if (t.includes("maroc") || t.includes("morocco") || t.includes("casablanca")) return "MA";
  if (t.includes("united kingdom") || t.includes("uk") || t.includes("london")) return "GB";
  return "NA";
}

const eq = (a:string,b:string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// TODO real adapters:
async function registryMA(regNo?:string, name?:string) {
  // placeholder: call your internal scraper/API or OpenCorporates if licensed.
  return { registration_number: regNo || "123456", company_name: name || "TECHNOVISION SARL" };
}
async function companiesHouseLookup(regNo?:string, name?:string) {
  return { registration_number: regNo, company_name: name };
}
