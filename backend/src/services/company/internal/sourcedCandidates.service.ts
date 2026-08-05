import crypto from "crypto";
import prisma from '../../../lib/prisma';


type UpsertInput = {
  payload: any;
  idempotencyKey: string | null;
};

function isValidStringArray(v: any): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export async function upsertSourcedCandidateService({ payload, idempotencyKey }: UpsertInput) {
  // Basic validation (keep it strict; better errors)
  const fingerprint = payload?.fingerprint;
  if (!fingerprint || typeof fingerprint !== "string") {
    return { action: "failed", reason: "missing_fingerprint", sourced_candidate_id: null };
  }

  // Optional: idempotency (MVP: best-effort)
  // If you want REAL idempotency, create an Idempotency table.
  // For now: we just compute a hash and ignore duplicates safely via unique fingerprint.
  const idemHash = idempotencyKey
    ? crypto.createHash("sha256").update(idempotencyKey).digest("hex")
    : null;

  const data = {
    fingerprint,
    source: String(payload.source || "unknown"),
    source_uid: payload.source_uid ? String(payload.source_uid) : null,
    source_profile_url: payload.source_profile_url ? String(payload.source_profile_url) : null,

    full_name: payload.full_name ? String(payload.full_name) : null,
    headline: payload.headline ? String(payload.headline) : null,
    about_me: payload.about_me ? String(payload.about_me) : null,
    location: payload.location ? String(payload.location) : null,
    city: payload.city ? String(payload.city) : null,

    skills: isValidStringArray(payload.skills) ? payload.skills : [],
    links: payload.links && typeof payload.links === "object" ? payload.links : null,

    email: payload.email ? String(payload.email).toLowerCase() : null,
    phone: payload.phone ? String(payload.phone) : null,
    linkedin_url: payload.linkedin_url ? String(payload.linkedin_url) : null,

    // If you added extra fields in Prisma (quality_score, summary), map them here
    // quality_score: typeof payload.quality_score === "number" ? payload.quality_score : null,
    // summary: payload.summary ? String(payload.summary) : null,
  };

  // Detect if it already exists (to return action)
  const existing = await prisma.sourcedCandidate.findUnique({
    where: { fingerprint },
    select: { sourced_candidate_id: true },
  });

  const upserted = await prisma.sourcedCandidate.upsert({
    where: { fingerprint },
    create: data,
    update: {
      ...data,
      updated_at: new Date(),
    },
    select: { sourced_candidate_id: true },
  });

  return {
    sourced_candidate_id: upserted.sourced_candidate_id,
    action: existing ? "updated" : "created",
    reason: null,
    idempotency: idemHash ? "provided" : "none",
  };
}
