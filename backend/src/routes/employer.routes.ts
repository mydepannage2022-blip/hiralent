// backend/src/routes/employer.routes.ts

import { Router } from "express";
import multer from "multer";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { validateBody } from "../middlewares/validateBody.middleware";
import {
  updateCompanyInfoSchema,
  updateContactSchema,
  updateBusinessDetailsSchema,
  updateHiringPreferencesSchema,
  updateSocialLinksSchema,
} from "../validation/employer.schema";
import {
  getProfileController,
  updateCompanyInfoController,
  updateContactController,
  updateBusinessDetailsController,
  updateHiringPreferencesController,
  updateSocialLinksController,
  uploadLogoController,
  removeLogoController,
  uploadCoverController,
  removeCoverController,
  checkSlugController,
  getPublicProfileController,
  getPublicJobsController,
} from "../controller/employer.controller";

const router = Router();

// Multer config for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    message: "Employer routes working",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// Get public company profile by slug
router.get("/public/:slug", getPublicProfileController);

// Get public company jobs by slug
router.get("/public/:slug/jobs", getPublicJobsController);

// Check slug availability (can be used with or without auth)
router.get("/check-slug/:slug", checkSlugController);

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

// Apply auth middleware to all routes below
router.use(checkAuth);

// Get company profile (dashboard)
router.get("/profile", getProfileController);

// Update company info section
router.patch(
  "/profile/company-info",
  validateBody(updateCompanyInfoSchema),
  updateCompanyInfoController
);

// Update contact section
router.patch(
  "/profile/contact",
  validateBody(updateContactSchema),
  updateContactController
);

// Update business details section
router.patch(
  "/profile/business-details",
  validateBody(updateBusinessDetailsSchema),
  updateBusinessDetailsController
);

// Update hiring preferences section
router.patch(
  "/profile/hiring-preferences",
  validateBody(updateHiringPreferencesSchema),
  updateHiringPreferencesController
);

// Update social links section
router.patch(
  "/profile/social-links",
  validateBody(updateSocialLinksSchema),
  updateSocialLinksController
);

// Logo upload/remove
router.post("/profile/logo", upload.single("logo"), uploadLogoController);
router.delete("/profile/logo", removeLogoController);

// Cover image upload/remove
router.post("/profile/cover", upload.single("cover"), uploadCoverController);
router.delete("/profile/cover", removeCoverController);

export default router;
