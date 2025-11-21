import { Router } from "express";
import { applyAsAgency, getApplicationStatus } from "../controller/agency/agency.controller";

const router = Router();

// Public routes (no auth required)
router.post("/apply", applyAsAgency);
router.get("/application/:id", getApplicationStatus);

export default router;