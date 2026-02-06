import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware'; 
import { checkTeamPermission } from '../middlewares/checkTeamPermission.middleware'; 
import { validateBody } from '../middlewares/validateBody.middleware'; 
import {
  inviteTeamMemberSchema,
  acceptInvitationSchema,
  updateTeamMemberSchema,
  updateMemberPermissionsSchema,
  transferOwnershipSchema,
} from '../validation/team.schema';
import {
  inviteTeamMemberController,
  resendInvitationController,
  cancelInvitationController,
  getInvitationDetailsController,
  acceptInvitationController,
  getTeamListController,
  getTeamMemberController,
  updateTeamMemberController,
  removeTeamMemberController,
  transferOwnershipController,
  getMemberPermissionsController,
  updateMemberPermissionsController,
  getMyPermissionsController,
  getActivityLogsController,
  getMemberActivityController,
  getActivitySummaryController,
} from '../controller/company/team.controller';

const router = Router();

// ==================== PUBLIC ROUTES (No Auth) ====================

router.get('/invitations/verify/:token', getInvitationDetailsController);
router.post('/invitations/accept/:token', validateBody(acceptInvitationSchema), acceptInvitationController);

// ==================== PROTECTED ROUTES ====================

router.use(checkAuth);

// Invitations
router.post('/invitations', checkTeamPermission('team', 'manage'), validateBody(inviteTeamMemberSchema), inviteTeamMemberController);
router.post('/invitations/:invitationId/resend', checkTeamPermission('team', 'manage'), resendInvitationController);
router.delete('/invitations/:invitationId', checkTeamPermission('team', 'manage'), cancelInvitationController);

// Team Members
router.get('/', checkTeamPermission('team', 'view'), getTeamListController);
router.get('/my-permissions', getMyPermissionsController);
router.get('/members/:memberId', checkTeamPermission('team', 'view'), getTeamMemberController);
router.patch('/members/:memberId', checkTeamPermission('team', 'manage'), validateBody(updateTeamMemberSchema), updateTeamMemberController);
router.delete('/members/:memberId', checkTeamPermission('team', 'manage'), removeTeamMemberController);
router.post('/transfer-ownership', validateBody(transferOwnershipSchema), transferOwnershipController);

// Permissions
router.get('/members/:memberId/permissions', checkTeamPermission('team', 'view'), getMemberPermissionsController);
router.put('/members/:memberId/permissions', checkTeamPermission('team', 'manage'), validateBody(updateMemberPermissionsSchema), updateMemberPermissionsController);

// Activity
router.get('/activity', checkTeamPermission('team', 'view'), getActivityLogsController);
router.get('/activity/summary', checkTeamPermission('team', 'view'), getActivitySummaryController);
router.get('/members/:memberId/activity', checkTeamPermission('team', 'view'), getMemberActivityController);

export default router;
