// backend/src/services/verification/loadExpected.ts
import prisma  from '../../lib/prisma';

type ExpectedProfile = {
  company_name?: string;
  registration_number?: string;
  address?: string;
};

export async function loadExpectedFromRun(runId: string): Promise<ExpectedProfile | undefined> {
  const run = await prisma.verificationRun.findUnique({
    where: { run_id: runId },
  });

  if (!run) return undefined;

  if (run.subject_type === 'COMPANY') {
    // subject_id should be the CompanyProfile.company_id (which is also User.user_id)
    const profile = await prisma.companyProfile.findUnique({
      where: { company_id: run.subject_id },
      select: {
        company_name: true,
        registration_number: true,
        tax_id: true,
        headquarters: true,
      },
    });

    if (!profile) return undefined;

    return {
      company_name: profile.company_name ?? undefined,
      // prefer explicit business registration_number, fallback to tax_id if you want
      registration_number: profile.registration_number ?? profile.tax_id ?? undefined,
      address: profile.headquarters ?? undefined,
    };
  }

  // (Optional) If later you support agency subject types, you can map fields here.
  // if (run.subject_type === 'AGENCY') { ... }

  return undefined;
}
