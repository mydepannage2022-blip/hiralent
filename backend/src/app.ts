import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://hiralent.vercel.app'
];

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow requests like Postman or server-to-server without origin
    if (!origin) return callback(null, true);

    // In development allow any localhost origin (different ports like 3001)
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

app.use(express.json()); // parse JSON body

// Routes
import authRoutes from './routes/auth/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import uploadRoutes from "./routes/upload.routes";
import ocrRoutes from './routes/ocr.routes';
import verificationRunRoutes from './routes/verification.run.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminVerificationRoutes from './routes/admin.verification.routes';
import sessionRoutes from './routes/auth/session.routes';
import questionRoutes from './routes/questions/question.routes';
import submissionsRoutes from './routes/submissions';
import executionRoutes from './routes/execution.routes';
// Dev-only routes are mounted below to avoid exposing them in production.


// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/verification/run', verificationRunRoutes);
app.use('/api/v1/auth/sessions', sessionRoutes);



// Register admin auth routes
app.use('/api/v1/admin', adminAuthRoutes);
app.use('/api/v1/admin', adminVerificationRoutes);


//Question Bank
app.use('/api/questions', questionRoutes);

// Submission endpoints (create, fetch)
app.use('/api/v1/submissions', submissionsRoutes);

// Execution-related endpoints (SSE stream, convenience fetch)
app.use('/api/v1', executionRoutes);

// Mount dev routes only in non-production to avoid touching production behavior
if (process.env.NODE_ENV !== 'production') {
  try {
    // require here so production bundles don't include dev-only code
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devRoutes = require('./routes/dev.routes').default;
    app.use('/dev', devRoutes);
  } catch (e) {
    console.warn('Dev routes not available:', (e as Error).message);
  }
}


app.get('/', (req: Request, res: Response) => {
  res.send("Backend running successfully");
});

export default app;
