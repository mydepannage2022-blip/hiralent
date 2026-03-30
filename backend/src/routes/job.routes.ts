import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';

// Import function-based controllers
import {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  patchJobStatus,
  getMyCompanyJobs,
  getCompanyJobsById,
  getJobApplicantsForJob,
  suggestJobBasics,
  generateJobDescription,
  improveJobDescription,
  listJobAssessments,
} from '../controller/company/job.controller';

const router = Router();

// ✅ Protect all routes (require auth middleware)
router.use(checkAuth);

// ============================
// 🔹 CRUD Job Routes
// ============================
router.post('/jobs', createJob);
router.get('/jobs', listJobs);
router.get('/jobs/:id', getJobById);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);
router.patch('/jobs/:id/status', patchJobStatus);
router.get('/jobs/:id/applicants', getJobApplicantsForJob);
// ============================
// 🔹 Company-specific Routes
// ============================
router.get('/jobs/company/my-jobs', getMyCompanyJobs);
router.get('/jobs/company/:companyId/jobs', getCompanyJobsById);

// ============================
// 🤖 Job AI Routes (Employer only)
// ============================
router.post('/jobs/ai/step1-suggest', suggestJobBasics);
router.post('/jobs/ai/step2-generate', generateJobDescription);
router.post('/jobs/ai/improve', improveJobDescription);

router.get("/jobs/:id/assessments", listJobAssessments);

export default router;
