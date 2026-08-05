import { Router } from "express";
import prisma from "../lib/prisma";
import { checkAuth, AuthenticatedRequest } from "../middlewares/checkAuth.middleware";

const router = Router();

// Both routes mutate verification state — /finalize can auto-set a company's
// verified=true — so they must never be callable unauthenticated.
router.use(checkAuth);

// Authorization for a COMPANY-subject verification run: the caller must be the
// company itself (their token's company_id === the subject company). Without this,
// any authenticated user (e.g. a candidate) could create/finalize verification for
// ANOTHER company — auto-approving or tampering its KYC state. Returns 403 if not.
function ensureSubjectOwnership(req: AuthenticatedRequest, res: any, subjectType: string, subjectId: string): boolean {
  if (subjectType === "COMPANY") {
    if (!req.user?.company_id || req.user.company_id !== subjectId) {
      res.status(403).json({ ok: false, error: "Forbidden: not your company" });
      return false;
    }
  }
  return true;
}

// Create a verification run
router.post("/create", async (req: AuthenticatedRequest, res) => {
  try {
    const { subject_type, subject_id } = req.body;

    if (!subject_type || !subject_id) {
      return res.status(400).json({
        ok: false,
        error: "subject_type and subject_id are required"
      });
    }

    if (!ensureSubjectOwnership(req, res, subject_type, subject_id)) return;

    // Create new verification run
    const run = await prisma.verificationRun.create({
      data: {
        subject_type,
        subject_id,
        status: "QUEUED",
        started_at: new Date(),
      },
    });

    return res.json({ 
      ok: true, 
      run_id: run.run_id 
    });
  } catch (e: any) {
    console.error("[create verification run] error:", e);
    return res.status(500).json({ 
      ok: false, 
      error: e.message || "Failed to create verification run" 
    });
  }
});

// Finalize verification run with automatic decision
router.post("/finalize", async (req: AuthenticatedRequest, res) => {
  try {
    const { run_id } = req.body;

    if (!run_id) {
      return res.status(400).json({ ok: false, error: "run_id is required" });
    }

    const run = await prisma.verificationRun.findUnique({
      where: { run_id },
      include: { signals: true },
    });

    if (!run) {
      return res.status(400).json({ ok: false, error: "Verification run not found" });
    }

    // Authorization from the run's OWN stored subject (source of truth — never trust
    // the client-supplied subject_id/type). A COMPANY run may only be finalized by
    // that company's own user; otherwise any authenticated user could approve/tamper
    // another company's KYC by passing its run_id.
    if (!ensureSubjectOwnership(req, res, run.subject_type, run.subject_id)) return;

    // Evaluate signals
    const allSignalsPassed = run.signals.every(signal => signal.passed === true);
    const hasSignals = run.signals.length > 0;

    let decision: "APPROVE" | "MANUAL_REVIEW" = "MANUAL_REVIEW";
    let verification_status: "verified" | "pending" = "pending";
    let reason_codes: string[] = [];
    let verification_notes = "";

    if (hasSignals) {
      if (allSignalsPassed) {
        decision = "APPROVE";
        verification_status = "verified";
        verification_notes = "Auto-approved: All verification checks passed";
      } else {
        // Build detailed explanation for pending review
        const failedChecks = run.signals.filter(s => !s.passed);
        const explanations: string[] = [];

        failedChecks.forEach(signal => {
          if (signal.signal_type === "doc_ocr_match") {
            const payload = signal.raw_payload as any;
            if (payload?.mismatches) {
              payload.mismatches.forEach((m: string) => {
                if (m.includes("company_name")) explanations.push("Company name doesn't match");
                if (m.includes("registration_number")) explanations.push("Registration number doesn't match");
                if (m.includes("address")) explanations.push("Address doesn't match");
              });
            }
          }
          reason_codes.push(signal.signal_type);
        });

        verification_notes = explanations.length > 0 
          ? `Pending review: ${explanations.join(", ")}. Please ensure your document clearly shows the correct information or re-upload a clearer document.`
          : "Pending manual review: Unable to verify document automatically";
      }
    } else {
      verification_notes = "Pending review: No verification signals generated";
    }

    const risk_score = hasSignals ? (run.signals.filter(s => !s.passed).length / run.signals.length) * 100 : 50;

    const updatedRun = await prisma.verificationRun.update({
      where: { run_id },
      data: {
        status: "COMPLETED",
        ended_at: new Date(),
        decision,
        risk_score,
        reason_codes,
      },
      include: { signals: true },
    });

    // Update company profile (use the run's own subject, not the client-supplied one).
    if (run.subject_type === "COMPANY") {
      const updateData: any = {
        verification_status,
        verification_submitted_at: new Date(),
        verification_notes,
      };

      if (decision === "APPROVE") {
        updateData.verified = true;
        updateData.verification_date = new Date();
      }

      await prisma.companyProfile.update({
        where: { company_id: run.subject_id },
        data: updateData,
      });
    }

    return res.json({ 
      ok: true, 
      run: updatedRun,
      decision,
      verification_status,
      risk_score,
      reason_codes,
      verification_notes
    });
  } catch (e: any) {
    console.error("[finalize verification run] error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
