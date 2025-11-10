import { Router } from 'express';
import { 
  createProfileController,
  getProfileController,
  updateProfileController,
  getCompanyStatsController
} from '../controller/company/profile.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import { 
  createCompanyProfileSchema,
  updateCompanyProfileSchema 
} from '../validation/company.schema';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ message: 'Company routes working', timestamp: new Date().toISOString() });
});
router.get('/profile', getProfileController);  // <-- Celle-ci manque !

router.use(checkAuth);

router.post(
  '/create-profile',
  checkAuth,
  validateBody(createCompanyProfileSchema),
  createProfileController
);
router.patch(
  '/profile',
  validateBody(updateCompanyProfileSchema),
  updateProfileController
);

router.get('/stats', getCompanyStatsController);

export default router;
