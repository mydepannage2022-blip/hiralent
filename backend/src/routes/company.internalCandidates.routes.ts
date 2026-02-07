import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { getInternalCandidateDetailsForCompany } from "../controller/company/internalCandidates.controller";

const router = Router();
router.use(checkAuth);

// ✅ GET /api/v1/company/candidates/internal/:candidateId
router.get(
  "/company/candidates/internal/:candidateId",
  getInternalCandidateDetailsForCompany
);

export default router;
