"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controller/company.controller");
const checkAuth_middleware_1 = require("../middlewares/checkAuth.middleware");
const validateBody_middleware_1 = require("../middlewares/validateBody.middleware");
const company_schema_1 = require("../validation/company.schema");
const router = (0, express_1.Router)();
// Health check (no auth)
router.get('/health', (_req, res) => {
    res.json({ message: 'Company routes working', timestamp: new Date().toISOString() });
});
// From here down, auth required
router.use(checkAuth_middleware_1.checkAuth);
// Create company profile
router.post('/create-profile', (0, validateBody_middleware_1.validateBody)(company_schema_1.createCompanyProfileSchema), company_controller_1.createProfileController);
// Get profile
router.get('/profile', company_controller_1.getProfileController);
// Update profile
router.patch('/profile', (0, validateBody_middleware_1.validateBody)(company_schema_1.updateCompanyProfileSchema), company_controller_1.updateProfileController);
// Stats
router.get('/stats', company_controller_1.getCompanyStatsController);
// Legacy redirect (kept short path for email links)
router.get('/upload', company_controller_1.uploadDocumentsRedirectController);
exports.default = router;
