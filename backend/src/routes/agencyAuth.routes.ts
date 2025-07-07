import express from "express";
import { validateBody } from "../middlewares/validateBody.middleware";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { checkRole } from "../middlewares/checkRole.middleware";
import { isEmailVerified } from "../middlewares/isEmailVerified.middleware";

import {
  createAgencyController,
  approveAgencyController,
  inviteRecruiterController,
  createAdminProfileController,
  agencyAuthMeController,
} from "../controller/agencyAuth.controller";

import {
  createAgencySchema,
  inviteRecruiterSchema,
  adminProfileSchema,
} from "../validation/agencyAuth.schema";

const router = express.Router();

router.post(
  "/create-agency",
  checkAuth,
  checkRole(["agency_admin"]),
  isEmailVerified,
  validateBody(createAgencySchema),
  createAgencyController
);

router.patch(
  "/:agencyId/approve",
  checkAuth,
  checkRole(["super_admin"]),
  approveAgencyController
);

router.post(
  "/invite-recruiter",
  checkAuth,
  checkRole(["agency_admin"]),
  isEmailVerified,
  validateBody(inviteRecruiterSchema),
  inviteRecruiterController
);

router.post(
  "/profile",
  checkAuth,
  checkRole(["agency_admin"]),
  validateBody(adminProfileSchema),
  createAdminProfileController
);

router.get(
  "/me",
  checkAuth,
  checkRole(["agency_admin"]),
  agencyAuthMeController
);

export default router;
