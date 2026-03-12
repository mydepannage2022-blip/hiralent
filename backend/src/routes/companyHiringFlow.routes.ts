import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { CompanyHiringFlowController } from "../controller/company/companyHiringFlow.controller";

const r = Router();
r.use(checkAuth);

// Reject application
r.post("/company/applications/:applicationId/reject", CompanyHiringFlowController.reject);

// Invite to simple test (job-level)
r.post("/company/applications/:applicationId/invite-simple-test", CompanyHiringFlowController.inviteSimpleTest);

// Invite to employer assessment
r.post("/company/applications/:applicationId/invite-assessment", CompanyHiringFlowController.inviteAssessment);

export default r;