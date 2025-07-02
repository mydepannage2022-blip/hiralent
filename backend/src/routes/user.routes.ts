import express from "express";
import { createProfile, getProfile } from "../controller/user.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { checkRole } from "../middlewares/checkRole.middleware";
import { validateBody } from "../middlewares/validateBody.middleware";
import { createUserProfileSchema } from "../validation/user.schema";

const router = express.Router();

router.post(
  "/users",
  checkAuth,
  checkRole("candidate", "recruiter"),
  validateBody(createUserProfileSchema),
  createProfile
);

router.get(
  "/users/:id",
  checkAuth,
  getProfile
);

export default router;
