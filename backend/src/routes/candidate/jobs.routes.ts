// src/routes/candidate/jobs.routes.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { CandidateJobsService } from "../../services/candidate/jobs.service";
import { CandidateJobsController } from "../../controller/candidate/jobs.controller";
import { checkAuth } from "../../middlewares/checkAuth.middleware";

const router = Router();
router.use(checkAuth);

// init
const prisma = new PrismaClient();
const service = new CandidateJobsService(prisma);
const controller = new CandidateJobsController(service);

/**
 * Jobs list (all ACTIVE)
 * GET /candidate/jobs?skills=react,nodejs&level=mid&eligible=true&page=1&limit=20&search=backend
 */
router.get("/", controller.listJobs);

/**
 * Recommended jobs (from JobRecommendation)
 * GET /candidate/jobs/recommended?eligible=true
 */
router.get("/recommended", controller.listRecommendedJobs);

/**
 * Eligibility for a job
 * GET /candidate/jobs/:jobId/eligibility
 */
router.get("/:jobId/eligibility", controller.getEligibility);

export default router;
