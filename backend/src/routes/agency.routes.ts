import { Router } from "express";
import { applyAsAgency, getApplicationStatus } from "../controller/agency/agency.controller";
import { getDashboardStats, getRecentActivities, getAnalytics } from "../controller/agency/agency.dashboard.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware"; 
import { createCase, listCases, getCaseById, getClients, updateCase } from "../controller/agency/agency.case.controller";

const router = Router();

// Public routes (no auth required)
router.post("/apply", applyAsAgency);
router.get("/application/:id", getApplicationStatus);

// Protected routes (require auth)
router.get("/dashboard/stats", checkAuth, getDashboardStats);
router.get("/dashboard/activities", checkAuth, getRecentActivities);
router.get("/dashboard/analytics", checkAuth, getAnalytics);

// Case Management Routes
router.post("/cases", checkAuth, createCase);
router.get("/cases", checkAuth, listCases);
router.get("/cases/:id", checkAuth, getCaseById);
router.put("/cases/:id", checkAuth, updateCase);
router.get("/clients", checkAuth, getClients);

export default router;