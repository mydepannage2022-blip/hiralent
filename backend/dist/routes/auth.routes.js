"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controller/auth.controller");
const validateBody_middleware_1 = require("../middlewares/validateBody.middleware");
const rateLimiter_middleware_1 = require("../middlewares/rateLimiter.middleware");
const checkAuth_middleware_1 = require("../middlewares/checkAuth.middleware");
const auth_schema_1 = require("../validation/auth.schema"); // Assuming Zod/Joi schema files
const router = express_1.default.Router();
router.post("/signup", (0, validateBody_middleware_1.validateBody)(auth_schema_1.SignupSchema), auth_controller_1.signupController);
router.post("/login", (0, validateBody_middleware_1.validateBody)(auth_schema_1.LoginSchema), auth_controller_1.loginController);
router.post("/resend-verification", checkAuth_middleware_1.checkAuth, auth_controller_1.resendVerificationController);
router.get("/verify-email", auth_controller_1.verifyEmailController);
router.post("/forgot-password", rateLimiter_middleware_1.limiter, (0, validateBody_middleware_1.validateBody)(auth_schema_1.ForgotPasswordSchema), auth_controller_1.forgotPasswordController);
router.post("/reset-password", (0, validateBody_middleware_1.validateBody)(auth_schema_1.ResetPasswordSchema), auth_controller_1.resetPasswordController);
exports.default = router;
