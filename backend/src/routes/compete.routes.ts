/**
 * Express Router for compete challenges
 *
 * Mount this router in app.ts:
 *   app.use("/api/v1/compete-challenges", competeRoutes);
 *
 * Expected middleware:
 * - checkAuth: ensures req.user exists and contains company_id/user_id
 *
 * Endpoints:
 * - POST   /            -> create challenge
 * - GET    /            -> list challenges for company (requires auth)
 * - GET    /:challenge_id -> get challenge details
 * - POST   /:challenge_id/start -> start challenge (mark active)
 * - POST   /:challenge_id/end   -> end challenge (mark completed)
 * - POST   /:challenge_id/results -> webhook for Youssra to POST results (protected)
 * - POST   /:challenge_id/simulate -> DEV-only simulate results
 * - GET    /:challenge_id/leaderboard -> view leaderboard
 */

import { Router } from "express";
import {
  createChallengeHandler,
  getChallengeHandler,
  listChallengesHandler,
  startChallengeHandler,
  endChallengeHandler,
  youssraResultsWebhookHandler,
  simulateResultsHandler,
  getLeaderboardHandler,
} from "../controller/company/compete.controller";

import { checkAuth } from "../middlewares/checkAuth.middleware"; // adjust path to your auth middleware
import { devOnly } from "../middlewares/devOnly";

const router = Router();

router.post("/", checkAuth, createChallengeHandler);
router.get("/", checkAuth, listChallengesHandler);
router.get("/:challenge_id", checkAuth, getChallengeHandler);
router.post("/:challenge_id/start", checkAuth, startChallengeHandler);
router.post("/:challenge_id/end", checkAuth, endChallengeHandler);

// Webhook: Youssra -> POST results
// IMPORTANT: protect this endpoint with a service key (see controller).
router.post("/:challenge_id/results", youssraResultsWebhookHandler);

// Dev-only simulate endpoint (writes leaderboard results, so it must NOT be reachable
// in prod — checkAuth alone would let any logged-in user forge results). devOnly runs
// first: outside dev+ENABLE_DEV_MINT it 404s before auth even runs.
router.post("/:challenge_id/simulate", devOnly, checkAuth, simulateResultsHandler);

// Leaderboard view (employer or candidate may call - we keep auth)
router.get("/:challenge_id/leaderboard", checkAuth, getLeaderboardHandler);

export default router;