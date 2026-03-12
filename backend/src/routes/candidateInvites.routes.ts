import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { CandidateInvitesController } from "../controller/candidate/candidateInvites.controller";

const r = Router();
r.use(checkAuth);

// Assessment invites
r.get("/candidate/assessment-invites", CandidateInvitesController.listAssessmentInvites);
r.post("/candidate/assessment-invites/:inviteId/accept", CandidateInvitesController.acceptAssessmentInvite);

// Simple test invites
r.get("/candidate/simple-test-invites", CandidateInvitesController.listSimpleTestInvites);
r.post("/candidate/simple-test-invites/:inviteId/accept", CandidateInvitesController.acceptSimpleTestInvite);

export default r;