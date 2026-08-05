import prisma from '../../../lib/prisma';


function toDateOrNull(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listCandidateCertifications(candidateId: string) {
  return prisma.certification.findMany({
    where: { candidate_id: candidateId },
    orderBy: { created_at: "desc" },
  });
}

export async function addCandidateCertification(candidateId: string, data: any) {
  // NOTE: Your Prisma model has issue_date REQUIRED.
  // If UI leaves it empty, we fallback to "today" to avoid crashing.
  const issueDate = toDateOrNull(data.issue_date) ?? new Date();

  const created = await prisma.certification.create({
    data: {
      candidate_id: candidateId,
      name: data.name,
      issuer: data.issuer,
      issue_date: issueDate,
      expiry_date: toDateOrNull(data.expiry_date),
      credential_id: data.credential_id || null,
      credential_url: data.credential_url || null,
    },
  });

  await recalcCompletenessAfterCertificationsChange(candidateId);
  return created;
}

export async function deleteCandidateCertification(candidateId: string, certificationId: string) {
  const row = await prisma.certification.findFirst({
    where: { certification_id: certificationId, candidate_id: candidateId },
  });
  if (!row) throw new Error("Certification not found");

  await prisma.certification.delete({ where: { certification_id: certificationId } });
  await recalcCompletenessAfterCertificationsChange(candidateId);

  return { success: true };
}

/**
 * BULK REPLACE/SYNC:
 * - Updates rows with certification_id
 * - Creates rows without certification_id
 * - Deletes rows not present anymore
 */
export async function upsertCandidateCertificationsBulk(candidateId: string, items: any[]) {
  const existing = await prisma.certification.findMany({
    where: { candidate_id: candidateId },
    select: { certification_id: true },
  });

  const existingIds = new Set(existing.map((x) => x.certification_id));
  const incomingIds = new Set(items.map((x) => x.certification_id).filter(Boolean));

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  await prisma.$transaction(async (tx) => {
    // delete removed
    if (toDelete.length) {
      await tx.certification.deleteMany({
        where: { candidate_id: candidateId, certification_id: { in: toDelete } },
      });
    }

    // update + create
    for (const item of items) {
      const issueDate = toDateOrNull(item.issue_date) ?? new Date();

      if (item.certification_id && existingIds.has(item.certification_id)) {
        await tx.certification.update({
          where: { certification_id: item.certification_id },
          data: {
            name: item.name,
            issuer: item.issuer,
            issue_date: issueDate,
            expiry_date: toDateOrNull(item.expiry_date),
            credential_id: item.credential_id || null,
            credential_url: item.credential_url || null,
          },
        });
      } else {
        await tx.certification.create({
          data: {
            candidate_id: candidateId,
            name: item.name,
            issuer: item.issuer,
            issue_date: issueDate,
            expiry_date: toDateOrNull(item.expiry_date),
            credential_id: item.credential_id || null,
            credential_url: item.credential_url || null,
          },
        });
      }
    }
  });

  await recalcCompletenessAfterCertificationsChange(candidateId);

  return prisma.certification.findMany({
    where: { candidate_id: candidateId },
    orderBy: { created_at: "desc" },
  });
}

/**
 * The Certification table is the single source of truth (Session 6, R-37 — the
 * denormalized CandidateProfile.certifications JSON mirror was dropped). This just
 * recalculates profile completeness after a certification add/delete/bulk change,
 * matching how the other profile sections trigger a recalc.
 */
export async function recalcCompletenessAfterCertificationsChange(candidateId: string) {
  try {
    const { calculateProfileCompleteness } = await import("../../candidate.service");
    await calculateProfileCompleteness(candidateId);
  } catch {
    // ignore if not available here
  }
}
