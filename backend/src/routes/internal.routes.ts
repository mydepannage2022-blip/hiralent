import { Router } from "express";
import { internalAuth } from "../middlewares/internalAuth.middleware";
import { upsertSourcedCandidate } from "../controller/company/internal/sourcedCandidates.controller";
import {
  createSourcingRun,
  addSourcingRunItem,
  completeSourcingRun,
} from "../controller/company/internal/sourcingRuns.controller";

const router = Router();

router.use(internalAuth);

router.post("/sourced-candidates/upsert", upsertSourcedCandidate);
// NEW: run persistence
router.post("/sourcing-runs", createSourcingRun);
router.post("/sourcing-runs/:run_id/items", addSourcingRunItem);
router.patch("/sourcing-runs/:run_id/complete", completeSourcingRun);

export default router;

