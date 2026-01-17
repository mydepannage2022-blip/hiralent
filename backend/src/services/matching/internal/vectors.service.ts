import { PrismaClient, VectorIndexStatus } from "@prisma/client";

export class MatchingVectorsService {
  constructor(private prisma: PrismaClient) {}

  async upsertCandidateVector(args: {
    candidate_id: string;
    qdrant_point_id?: string | null;
    embedding_hash?: string | null;
    provider?: string | null;
    status?: VectorIndexStatus;
    error?: string | null;
  }) {
    const {
      candidate_id,
      qdrant_point_id = null,
      embedding_hash = null,
      provider = null,
      status = VectorIndexStatus.INDEXED,
      error = null,
    } = args;

    const now = new Date();

    return this.prisma.candidateVector.upsert({
      where: { candidate_id },
      update: {
        qdrant_point_id,
        embedding_hash,
        provider,
        status,
        indexed_at: status === VectorIndexStatus.INDEXED ? now : undefined,
        last_attempt_at: now,
        last_error: error,
      },
      create: {
        candidate_id,
        qdrant_point_id,
        embedding_hash,
        provider,
        status,
        indexed_at: status === VectorIndexStatus.INDEXED ? now : null,
        last_attempt_at: now,
        last_error: error,
      },
    });
  }

  async upsertJobVector(args: {
    job_id: string;
    qdrant_point_id?: string | null;
    embedding_hash?: string | null;
    provider?: string | null;
    status?: VectorIndexStatus;
    error?: string | null;
  }) {
    const {
      job_id,
      qdrant_point_id = null,
      embedding_hash = null,
      provider = null,
      status = VectorIndexStatus.INDEXED,
      error = null,
    } = args;

    const now = new Date();

    return this.prisma.jobVector.upsert({
      where: { job_id },
      update: {
        qdrant_point_id,
        embedding_hash,
        provider,
        status,
        indexed_at: status === VectorIndexStatus.INDEXED ? now : undefined,
        last_attempt_at: now,
        last_error: error,
      },
      create: {
        job_id,
        qdrant_point_id,
        embedding_hash,
        provider,
        status,
        indexed_at: status === VectorIndexStatus.INDEXED ? now : null,
        last_attempt_at: now,
        last_error: error,
      },
    });
  }
}
