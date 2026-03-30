// backend/src/routes/simpleTest.routes.ts
import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { CandidateSimpleTestController } from "../controller/candidate/simpleTest.controller";

const r = Router();

r.use(checkAuth);

/**
 * Simple Test lifecycle
 */

// Start new attempt
// POST /candidate/simple-tests/start
r.post(
  "/candidate/simple-tests/start",
  CandidateSimpleTestController.start
);

// Get attempt + questions
// GET /candidate/simple-tests/:attemptId
r.get(
  "/candidate/simple-tests/:attemptId",
  CandidateSimpleTestController.get
);

// Run coding question (Hiralent runner integration)
// POST /candidate/simple-tests/:attemptId/run
r.post(
  "/candidate/simple-tests/:attemptId/run",
  CandidateSimpleTestController.run
);

// Get runner submission status/result
// GET /candidate/simple-tests/submissions/:submissionId
r.get(
  "/candidate/simple-tests/submissions/:submissionId",
  CandidateSimpleTestController.getSubmission
);

// Final submit (compute simple test score)
// POST /candidate/simple-tests/:attemptId/submit
r.post(
  "/candidate/simple-tests/:attemptId/submit",
  CandidateSimpleTestController.submit
);

export default r;
