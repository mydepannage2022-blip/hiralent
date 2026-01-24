import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ListInput = {
  q?: string;
  source?: string;
  status?: string;
  page: number;
  limit: number;
};

export async function listExternalCandidatesService(input: ListInput) {
  const { q, source, status, page, limit } = input;

  const where: any = {};

  if (source) where.source = source;
  if (status) where.status = status;

  if (q) {
    where.OR = [
      { full_name: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { skills: { has: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.sourcedCandidate.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sourcedCandidate.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
  };
}

export async function getExternalCandidateByIdService(id: string) {
  return prisma.sourcedCandidate.findUnique({
    where: { sourced_candidate_id: id },
  });
}

export async function listExternalSourcesService(): Promise<string[]> {
  const rows = await prisma.sourcedCandidate.findMany({
    distinct: ["source"],
    select: { source: true },
  });

  return rows.map((r) => r.source);
}
