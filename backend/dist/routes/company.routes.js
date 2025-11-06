"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controller/company/profile.controller");
const checkAuth_middleware_1 = require("../middlewares/checkAuth.middleware");
const validateBody_middleware_1 = require("../middlewares/validateBody.middleware");
const company_schema_1 = require("../validation/company.schema");
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.json({ message: 'Company routes working', timestamp: new Date().toISOString() });
});
router.use(checkAuth_middleware_1.checkAuth);
router.post('/create-profile', checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(company_schema_1.createCompanyProfileSchema), profile_controller_1.createProfileController);
router.patch('/profile', (0, validateBody_middleware_1.validateBody)(company_schema_1.updateCompanyProfileSchema), profile_controller_1.updateProfileController);
router.get('/stats', profile_controller_1.getCompanyStatsController);
exports.default = router;
