import { Router } from "express";
import {
  searchCandidatesPublicController,
  searchJobsPublicController,
} from "../controller/search.controller";
import { optionalAuth } from "../middlewares/optionalAuth.middleware";

const router = Router();

// GET /api/v1/search/candidates?q=...&location=...&page=1&limit=12
router.get("/candidates", optionalAuth, searchCandidatesPublicController);

// GET /api/v1/search/jobs?q=...&location=...&page=1&limit=12
router.get("/jobs", searchJobsPublicController);

export default router;
