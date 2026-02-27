import { Router } from "express";
import { searchCandidatesPublicController } from "../controller/search.controller";

const router = Router();

// Public route — no auth required
// GET /api/v1/search/candidates?q=...&location=...&page=1&limit=12
router.get("/candidates", searchCandidatesPublicController);

export default router;
