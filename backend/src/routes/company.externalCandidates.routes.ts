import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import {
  listExternalCandidates,
  getExternalCandidateById,
  listExternalSources,
} from "../controller/company/externalCandidates.controller";

const router = Router();

// Company auth
router.use(checkAuth);

/**
 * External candidates (from scraping) - employer dashboard
 *
 * GET /api/v1/company/candidates/external?q=&source=&status=&page=&limit=
 * GET /api/v1/company/candidates/external/sources
 * GET /api/v1/company/candidates/external/:id
 */

// List (with filters)
router.get("/company/candidates/external", listExternalCandidates);

// Sources dropdown
router.get("/company/candidates/external/sources", listExternalSources);

// Details
router.get("/company/candidates/external/:id", getExternalCandidateById);

export default router;
