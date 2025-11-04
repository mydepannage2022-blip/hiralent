import express from 'express';
import { QuestionController } from '../../controller/question/question.controller';

const router = express.Router();
const controller = new QuestionController();

console.log(' Loading question routes...');

// Add route-specific debug
router.use((req, res, next) => {
  console.log(' ROUTER - Incoming:', req.method, req.url);
  next();
});

// ========== SIMPLE TEST ROUTE FIRST ==========
router.post('/test-simple', (req, res) => {
  console.log(' SIMPLE TEST ROUTE HIT!');
  res.json({ success: true, message: 'Simple test works!' });
});

// ========== YOUR ACTUAL ROUTES ==========

// POST /api/questions
router.post('/', (req, res) => {
  console.log(' POST / hit - should create question');
  controller.createQuestion(req, res);
});

// GET /api/questions
router.get('/', (req, res) => {
  console.log(' GET / hit');
  controller.getAllQuestions(req, res);
});

// GET /api/questions/:id
router.get('/:id', (req, res) => {
  console.log(' GET /:id hit - ID:', req.params.id);
  controller.getQuestionById(req, res);
});

// PUT /api/questions/:id
router.put('/:id', (req, res) => {
  console.log(' PUT /:id hit - ID:', req.params.id);
  controller.updateQuestion(req, res);
});

// Other routes...
router.get('/stats/overview', controller.getStats.bind(controller));
router.post('/generate', controller.generateQuestion.bind(controller));
router.patch('/:id/approve', controller.approveQuestion.bind(controller));
router.patch('/:id/reject', controller.rejectQuestion.bind(controller));
router.post('/bulk/approve', controller.bulkApprove.bind(controller));
router.post('/bulk/delete', controller.bulkDelete.bind(controller));
router.delete('/:id', controller.deleteQuestion.bind(controller));

// 404 handler for this router
router.use((req, res) => {
  console.log(' ROUTER 404 - No route matched in question router:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} /api/questions${req.url}`
  });
});

console.log(' Question routes loaded successfully');

export default router;