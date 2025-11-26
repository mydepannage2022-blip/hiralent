import { Router } from "express";
import {
  getPendingAgencies,
  getAllAgencies,
  getAgencyById,
  approveAgency,
  rejectAgency,
  getAgencyStats,
} from "../controller/superadmin/admin.agency.controller";

const router = Router();

// Admin agency routes
router.get("/agencies/stats", getAgencyStats);
router.get("/agencies/pending", getPendingAgencies);
router.get("/agencies/all", getAllAgencies);
router.get("/agencies/:id", getAgencyById);
router.post("/agencies/:id/approve", approveAgency);
router.post("/agencies/:id/reject", rejectAgency);

export default router;