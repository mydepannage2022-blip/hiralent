-- Session 6 / Phase 2.5 (R-37): data-model correctness fixes.
-- postal_code INTEGER -> TEXT so international alphanumeric codes (e.g. "SW1A 1AA") are
-- representable (int->text assignment cast converts existing numeric values in place).
-- Drop CandidateProfile.certifications (Json) — the denormalized mirror that drifted;
-- the Certification table is the single source of truth (search now reads it directly).

-- AlterTable
ALTER TABLE "CandidateProfile" DROP COLUMN "certifications",
ALTER COLUMN "postal_code" SET DATA TYPE TEXT;
