import { Router } from "express";
import { adminSecurityStack } from "../middlewares/adminAuth.middleware";
import {
  getPendingAgencies,
  getAllAgencies,
  getAgencyById,
  approveAgency,
  rejectAgency,
  getAgencyStats,
} from "../controller/superadmin/admin.agency.controller";

const router = Router();

// All agency admin routes are superadmin-only (approve/reject agencies). Same admin
// auth stack as admin.verification.routes — these were previously fully unguarded.
router.use(adminSecurityStack);

// Admin agency routes
router.get("/agencies/stats", getAgencyStats);
router.get("/agencies/pending", getPendingAgencies);
router.get("/agencies/all", getAllAgencies);
router.get("/agencies/:id", getAgencyById);
router.post("/agencies/:id/approve", approveAgency);
router.post("/agencies/:id/reject", rejectAgency);

export default router;