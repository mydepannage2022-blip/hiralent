import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toDateOrNull(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Convert DB row -> JSON stored in CandidateProfile.certifications
 */
function toProfileJson(c: any) {
  return {
    id: c.certification_id,
    name: c.name,
    issuer: c.issuer,
    issue_date: c.issue_date ? c.issue_date.toISOString().slice(0, 10) : null,
    expiry_date: c.expiry_date ? c.expiry_date.toISOString().slice(0, 10) : null,
    credential_id: c.credential_id ?? null,
    credential_url: c.credential_url ?? null,
    is_verified: c.is_verified ?? false,
  };
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

  await syncProfileCertificationsJson(candidateId);
  return created;
}

export async function deleteCandidateCertification(candidateId: string, certificationId: string) {
  const row = await prisma.certification.findFirst({
    where: { certification_id: certificationId, candidate_id: candidateId },
  });
  if (!row) throw new Error("Certification not found");

  await prisma.certification.delete({ where: { certification_id: certificationId } });
  await syncProfileCertificationsJson(candidateId);

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

  await syncProfileCertificationsJson(candidateId);

  return prisma.certification.findMany({
    where: { candidate_id: candidateId },
    orderBy: { created_at: "desc" },
  });
}

export async function syncProfileCertificationsJson(candidateId: string) {
  const rows = await prisma.certification.findMany({
    where: { candidate_id: candidateId },
    orderBy: { created_at: "desc" },
  });

  const json = rows.map(toProfileJson);

  await prisma.candidateProfile.upsert({
    where: { candidate_id: candidateId },
    update: { certifications: json, updated_at: new Date() },
    create: { candidate_id: candidateId, certifications: json },
  });

  // optional: trigger completeness recalculation like your other sections
  try {
    const { calculateProfileCompleteness } = await import("../candidate.service");
    await calculateProfileCompleteness(candidateId);
  } catch {
    // ignore if not available here
  }

  return json;
}
