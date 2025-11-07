import { Router } from 'express';

// ✅ use your real auth middleware export + path
import { checkAuth } from '../middlewares/checkAuth.middleware';

// ✅ controller you fixed (AuthedReq + asyncHandler)
import {
  createDirect,
  createFromRequest,
  createFromJD,
  createWithChatbot,
  getById,
  list,
  update,
  remove,
} from '../controller/company/employerAssessment.controller';

const router = Router();

/**
 * All routes require an authenticated user.
 * `checkAuth` attaches req.user = { user_id, role, ... } from the JWT.
 */
router.use(checkAuth);

// ---- Create flows ----
router.post('/', createDirect);                         // direct create (no AI)
router.post('/create-from-request', createFromRequest); // dispatcher: JD-parse OR chatbot
router.post('/from-jd', createFromJD);                  // JD parse -> AI.extractSkills (+optional AI.generateQuestions)
router.post('/with-chatbot', createWithChatbot);        // start chatbot-guided flow

// ---- Read ----
router.get('/:assessment_id', getById);                 // get one by id
router.get('/', list);                                  // list by company (optional ?status=&job_id=)

// ---- Update / Delete ----
router.put('/', update);                                // update fields / optional regenerate
router.delete('/', remove);                             // delete by assessment_id

export default router;
