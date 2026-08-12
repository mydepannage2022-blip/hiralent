import { Router } from 'express';
import { adminSecurityStack } from '../middlewares/adminAuth.middleware';
import {
  listAdmins,
  createAdmin,
  deleteAdmin,
  getMe,
  updateMe,
  changePassword,
  getPlatformSettings,
  updatePlatformSettings,
  getAnalyticsOverview,
  getAuditLogs,
  refundPayment,
} from '../controller/superadmin/admin.management.controller';
import { validateBody } from '../middlewares/validateBody.middleware';
import { refundTransactionSchema } from '../validation/subscription.schema';

const router = Router();

// Superadmin-only, same guard stack as the agency/verification admin routers. All paths
// here (/admins, /me, /settings/platform, /analytics/*, /audit-logs) are disjoint from
// /auth/*, /agencies/* and /verifications/*, so mount order among the admin routers is
// safe — but the whole group must stay mounted BEFORE the /api/v1 jobRoutes catch-all.
router.use(adminSecurityStack);

// Manage admins (Admins page)
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);

// Own profile + password (Settings page — section A)
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', changePassword);

// Platform settings (Settings page — section B)
router.get('/settings/platform', getPlatformSettings);
router.put('/settings/platform', updatePlatformSettings);

// Analytics overview (Analytics page)
router.get('/analytics/overview', getAnalyticsOverview);

// Security Log / audit trail (Security Log page)
router.get('/audit-logs', getAuditLogs);

// Billing: refund a transaction. Path is disjoint from the other admin routers, so the shared
// mount order stays safe (see note above).
router.post('/transactions/:id/refund', validateBody(refundTransactionSchema), refundPayment);

export default router;
