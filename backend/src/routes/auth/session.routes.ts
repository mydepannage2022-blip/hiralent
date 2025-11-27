// backend/src/routes/session.routes.ts

import express from 'express';
import {
  getUserSessionsController,
  getCurrentSessionController,
  terminateSessionController,
  terminateOtherSessionsController,
  terminateAllSessionsController,
  updateSessionActivityController,
  createSessionController,
  getSessionsForUserController
} from '../../controller/auth/session.controller';
import { checkAuth } from '../../middlewares/checkAuth.middleware';
import { checkRole } from '../../middlewares/checkRole.middleware';

const router = express.Router();

router.use(checkAuth);

router.get('/', getUserSessionsController);

router.get('/current', getCurrentSessionController);

router.delete('/:sessionId', terminateSessionController);

router.delete('/others/terminate', terminateOtherSessionsController);

router.delete('/all/terminate', terminateAllSessionsController);

router.put('/activity', updateSessionActivityController);

router.post('/create', createSessionController);

router.get('/user/:userId', checkRole('superadmin', 'admin'), getSessionsForUserController);

export default router;
