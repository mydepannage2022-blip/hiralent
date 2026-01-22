// src/routes/company.candidateRanking.routes.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { CandidateRankingService } from "../services/company/candidateRanking.service";
import { CandidateRankingController } from "../controller/company/candidateRanking.controller";

const router = Router();
router.use(checkAuth);

const prisma = new PrismaClient();
const service = new CandidateRankingService(prisma);
const controller = new CandidateRankingController(service);

/**
 * Company-side candidate ranking for a job
 * GET /company/jobs/:jobId/candidates-ranking
 */
router.get(
  "/company/jobs/:jobId/candidates-ranking",
  controller.getRankedCandidatesForJob
);

export default router;
