/**
 * Express controllers for compete routes.
 *
 * Notes:
 * - Assumes you have an auth middleware (checkAuth) which sets req.user with user_id and company_id.
 * - We validate basic input here; further validation (Zod/Joi) is recommended.
 * - Integration notes (Wafaa/Youssra) are marked as TODO and explained in comments.
 */

import { Request, Response } from "express";
import * as service from "../../services/company/compete.service";
import { CreateCompeteChallengeDTO, CandidateResultDTO } from "../../types/compete.types";

export async function createChallengeHandler(req: Request, res: Response) {
  try {
    const body = req.body as CreateCompeteChallengeDTO;
    // Basic validation
    if (!body.assessment_id || !body.title || !Array.isArray(body.candidate_ids) || body.candidate_ids.length === 0) {
      return res.status(400).json({ error: "assessment_id, title and candidate_ids are required" });
    }

    // Optional: ensure the caller (req.user.company_id) owns the assessment_id (authorize)
    // TODO: add authorization check here

    const created = await service.createChallenge(body, (req as any).user?.company_id);
    return res.status(201).json({ ok: true, challenge: created });
  } catch (err: any) {
    console.error("createChallengeHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

export async function getChallengeHandler(req: Request, res: Response) {
  try {
    const id = req.params.challenge_id;
    const challenge = await service.getChallengeById(id);
    if (!challenge) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true, challenge });
  } catch (err: any) {
    console.error("getChallengeHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

export async function listChallengesHandler(req: Request, res: Response) {
  try {
    const companyId = (req as any).user?.company_id;
    if (!companyId) return res.status(403).json({ error: "forbidden" });

    const list = await service.listChallengesByCompany(companyId);
    return res.json({ ok: true, challenges: list });
  } catch (err: any) {
    console.error("listChallengesHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

export async function startChallengeHandler(req: Request, res: Response) {
  try {
    const id = req.params.challenge_id;
    // Optional body for start options
    const opts = req.body;
    const started = await service.startChallenge(id, opts);

    // NOTE: This is the appropriate place to kick off Wafaa request for variants:
    // - Example flow (not implemented here):
    //   const variants = await wafaaClient.requestVariants({ assessmentId: started.assessment_id, candidates: started.candidate_ids });
    //   persist variants -> you might create a CompeteQuestionVariant table to map candidate -> question variant ids.
    //
    // For now we simply set status=active.

    return res.json({ ok: true, challenge: started });
  } catch (err: any) {
    console.error("startChallengeHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

export async function endChallengeHandler(req: Request, res: Response) {
  try {
    const id = req.params.challenge_id;
    const ended = await service.endChallenge(id);
    return res.json({ ok: true, challenge: ended });
  } catch (err: any) {
    console.error("endChallengeHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

/**
 * Endpoint to be called by Youssra webhook (or used in dev to simulate results).
 *
 * IMPORTANT: In production this endpoint must be protected:
 * - Authenticate the caller (API key, HMAC signature, mutual TLS)
 * - Validate payload contents (candidate belongs to challenge, score range 0..100)
 *
 * For dev: we use a simple header x-service-key check or environment variable.
 */
export async function youssraResultsWebhookHandler(req: Request, res: Response) {
  try {
    const key = req.header("x-service-key");
    const expected = process.env.YOUSSRRA_WEBHOOK_KEY;
    if (!expected || key !== expected) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const challengeId = req.params.challenge_id;
    const payload = req.body as CandidateResultDTO;
    if (!payload || !payload.candidate_id) return res.status(400).json({ error: "invalid_payload" });

    // Security/ownership checks should be added here in production

    const updated = await service.updateLeaderboardWithResults(challengeId, payload);
    return res.json({ ok: true, challenge: updated });
  } catch (err: any) {
    console.error("youssraResultsWebhookHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

/**
 * Dev-only: simulate results for a candidate (you can call this from your frontend to test)
 */
export async function simulateResultsHandler(req: Request, res: Response) {
  try {
    const challengeId = req.params.challenge_id;
    const payload = req.body as CandidateResultDTO;
    if (!payload || !payload.candidate_id) return res.status(400).json({ error: "invalid_payload" });
    const updated = await service.simulateResultsForCandidate(challengeId, payload);
    return res.json({ ok: true, challenge: updated });
  } catch (err: any) {
    console.error("simulateResultsHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}

export async function getLeaderboardHandler(req: Request, res: Response) {
  try {
    const challengeId = req.params.challenge_id;
    const leaderboard = await service.getLeaderboard(challengeId);
    if (leaderboard == null) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true, leaderboard });
  } catch (err: any) {
    console.error("getLeaderboardHandler error:", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
}