import { Router } from "express";
import { internalAuth } from "../../middlewares/internalAuth.middleware";
import { upsertCandidateVector, upsertJobVector } from "../../controller/matching/internal/vectors.controller";
import { upsertJobRecommendations } from "../../controller/matching/internal/recommendations.controller";

const router = Router();

router.use(internalAuth);

router.post("/vectors/candidate", upsertCandidateVector);
router.post("/vectors/job", upsertJobVector);
router.post("/recommendations/upsert", upsertJobRecommendations);

export default router;
