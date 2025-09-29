import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// existing routes
import authRoutes from './routes/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import ocrRoutes from './routes/ocr.routes';

// NEW: verification routes + minimal auth middleware
// Make sure the file exists at the correct path and matches the import statement.
// If the file is named differently (e.g., verificationCompany.routes.ts), update the import accordingly.
import companyVerificationRoutes from './routes/verification.company.routes';
import agencyVerificationRoutes from './routes/verification.agency.routes';
// Update the import path if the file is named differently, e.g., 'authMiddleware.ts'
// Update the import path if the file is named differently, e.g., 'authMiddleware.ts'
// Update the import path if the file is named differently, e.g., 'auth.middleware.ts'
import { authMiddleware } from './middlewares/auth.middleware';
// If the file is actually named 'authMiddleware.ts', ensure it exists at 'src/middleware/authMiddleware.ts'

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://hiralent.vercel.app',
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ✅ Apply auth to everything below (adjust as needed)
app.use(authMiddleware);

// Existing mounts
app.use('/api/ocr', ocrRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);

// ✅ NEW: Verification flows (plural base paths to match the spec)
app.use('/api/v1/companies', companyVerificationRoutes); // -> /companies/:id/verification...
app.use('/api/v1/agencies', agencyVerificationRoutes);   // -> /agencies/:id/verification...

// Simple root
app.get('/', (_req: Request, res: Response) => {
  res.send('backend running successfully');
});

// ✅ 404 handler (after all routes)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ✅ Centralized error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || 'Internal Server Error' });
});

export default app;
