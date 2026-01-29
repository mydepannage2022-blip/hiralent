import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';

import {
  createDirect,
  createFromRequest,
  createFromJD,
  createWithChatbot,
  sendChatbotMessage,
  getById,
  list,
  update,
  updateStatus,
  remove,
  generateQuestionsForAssessment,
  listAssessmentQuestions,
  updateAssessmentQuestionOverrideController,
  attachQuestionsManualController,
  detachQuestionController,
  reorderAssessmentQuestionsController,
} from '../controller/company/employerAssessment.controller';

const router = Router();

/**
 * All routes require an authenticated user.
 * `checkAuth` attaches req.user = { user_id, role, ... } from the JWT.
 */
router.use(checkAuth);

// ---- Create flows ----
router.post('/', createDirect);                         // direct create (MANUAL method)
router.post('/create-from-request', createFromRequest); // dispatcher: JD-parse OR chatbot
router.post('/from-jd', createFromJD);                  // JD parse -> AI.extractSkills (+optional AI.generateQuestions)
router.post('/with-chatbot', createWithChatbot);        // start chatbot-guided flow
router.post('/chatbot/message', sendChatbotMessage);

// ---- Question generation (Wafaa link) ----
router.get('/:assessment_id/questions', listAssessmentQuestions);
router.post('/:assessment_id/generate-questions', generateQuestionsForAssessment);
router.post(
  "/:assessment_id/questions/attach",
  attachQuestionsManualController
);

router.delete(
  "/:assessment_id/questions/:question_id",
  detachQuestionController
);

router.patch(
  "/:assessment_id/questions/reorder",
  reorderAssessmentQuestionsController
);

// ---- Read ----
router.get('/:assessment_id', getById);                 // get one by id
router.get('/', list);                                  // list by company (optional ?status=&job_id=)

// ---- Update / Delete ----
router.put('/', update);                                // update fields / optional regenerate
router.patch('/status', updateStatus);                  // update only status
router.delete('/', remove);                             // delete by assessment_id

router.patch(
  "/:assessment_id/questions/:question_id/override",
  updateAssessmentQuestionOverrideController
);

export default router;