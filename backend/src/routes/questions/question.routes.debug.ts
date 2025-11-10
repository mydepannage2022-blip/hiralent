import express from 'express';

const router = express.Router();

console.log('🐛 [ROUTES DEBUG] Loading question routes...');

// Middleware de debug pour ce router
router.use((req, res, next) => {
  console.log('📝 [ROUTER DEBUG] Inside question router:', {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params
  });
  next();
});

// Route GET simple pour tester
router.get('/', (req, res) => {
  console.log('✅ [DEBUG] GET / route hit');
  res.json({ 
    success: true, 
    message: 'Root questions route works!',
    timestamp: new Date().toISOString()
  });
});

// Route GET by ID debug
router.get('/:id', (req, res) => {
  console.log('✅ [DEBUG] GET /:id route hit', { id: req.params.id });
  res.json({ 
    success: true, 
    message: 'Get by ID works!',
    id: req.params.id,
    timestamp: new Date().toISOString()
  });
});

// Route PATCH approve debug
router.patch('/:id/approve', (req, res) => {
  console.log('✅ [DEBUG] PATCH /:id/approve route hit', { id: req.params.id });
  res.json({ 
    success: true, 
    message: 'Approve route works!',
    id: req.params.id
  });
});

// Route PATCH reject debug  
router.patch('/:id/reject', (req, res) => {
  console.log('✅ [DEBUG] PATCH /:id/reject route hit', { id: req.params.id });
  res.json({ 
    success: true, 
    message: 'Reject route works!',
    id: req.params.id
  });
});

console.log('🐛 [ROUTES DEBUG] Question debug routes loaded');

export default router;
