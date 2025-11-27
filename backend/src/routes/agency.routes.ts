import { Router } from "express";
import { applyAsAgency, getApplicationStatus } from "../controller/agency/agency.controller";
import { getDashboardStats, getRecentActivities } from "../controller/agency/agency.dashboard.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware"; 

const router = Router();

// Public routes (no auth required)
router.post("/apply", applyAsAgency);
router.get("/application/:id", getApplicationStatus);

// Protected routes (require auth)
router.get("/dashboard/stats", checkAuth, getDashboardStats);
router.get("/dashboard/activities", checkAuth, getRecentActivities);

export default router;