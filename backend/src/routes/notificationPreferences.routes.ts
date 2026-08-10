import { Router } from "express";
import { z } from "zod";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { validateBody } from "../middlewares/validateBody.middleware";
import {
  getPreferencesController,
  updatePreferencesController,
} from "../controller/notificationPreferences.controller";

const router = Router();

// Role-neutral: keyed by the authenticated user. Key-sets differ per role, so we accept an
// object of boolean toggles — but bound the key COUNT and key LENGTH so a client can't PUT an
// unbounded blob into its JSON row (storage-bloat DoS — Wave 4 review). Real key-sets are < 20.
const MAX_PREF_KEYS = 100;
const MAX_PREF_KEY_LEN = 100;
const preferencesSchema = z
  .record(z.string().max(MAX_PREF_KEY_LEN), z.boolean())
  .refine((obj) => Object.keys(obj).length <= MAX_PREF_KEYS, {
    message: `Too many preference keys (max ${MAX_PREF_KEYS}).`,
  });

router.get("/", checkAuth, getPreferencesController);
router.put(
  "/",
  checkAuth,
  validateBody(preferencesSchema),
  updatePreferencesController
);

export default router;
