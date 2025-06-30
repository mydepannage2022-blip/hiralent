import { Router } from "express";
import { signupController, loginController, oauthController } from "../controller/auth.controller";

const router = Router();

router.post("/signup", signupController);
router.post("/login", loginController);
router.post("/oauth", oauthController); // for Google/Facebook OAuth

export default router;
