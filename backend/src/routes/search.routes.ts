import { Router } from "express";
import { searchCandidatesPublicController } from "../controller/search.controller";
import { optionalAuth } from "../middlewares/optionalAuth.middleware";

const router = Router();

// Public route — optionalAuth enriches req.user when a valid token is present,
// but never blocks unauthenticated requests (guests get limited fields).
// GET /api/v1/search/candidates?q=...&location=...&page=1&limit=12
router.get("/candidates", optionalAuth, searchCandidatesPublicController);

export default router;
