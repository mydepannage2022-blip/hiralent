import { Router } from 'express';
import { jobController } from '../controller/company/job.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';

const router = Router();

// Protect all
router.use(checkAuth);

// CRUD - Job Posting Only
router.post('/jobs', (req, res) => jobController.createJob(req, res));
router.get('/jobs', (req, res) => jobController.listJobs(req, res));
router.get('/jobs/:id', (req, res) => jobController.getJobById(req, res));
router.put('/jobs/:id', (req, res) => jobController.updateJob(req, res));
router.delete('/jobs/:id', (req, res) => jobController.deleteJob(req, res));
router.patch('/jobs/:id/status', (req, res) => jobController.patchJobStatus(req, res));

// Company-specific
router.get('/jobs/company/my-jobs', (req, res) => jobController.getMyCompanyJobs(req, res));
router.get('/jobs/company/:companyId/jobs', (req, res) => jobController.getCompanyJobsById(req, res));


export default router;