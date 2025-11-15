import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://hiralent.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests like Postman or server-to-server without origin
    if (!origin) return callback(null, true);
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
import questionRoutes from './routes/questions/question.routes';
import sessionRoutes from './routes/auth/session.routes'
import insightsRoutes from './routes/insights.routes';
import jobRoutes from './routes/job.routes';
import employerAssessmentRoutes from './routes/employerAssessment.routes';
import messageRoutes from './routes/message.routes'


// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/v1/verification/run', verificationRunRoutes);
app.use('/api/v1/auth/sessions', sessionRoutes);


app.use('/api/v1/messages', messageRoutes);


//Question Bank
app.use('/api/questions', questionRoutes);

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


// ✅ Admin routes ONLY here (use ADMIN_JWT_SECRET internally)
app.use('/api/v1/admin', adminAuthRoutes);
app.use('/api/v1/admin', adminVerificationRoutes);

app.use('/api/v1', insightsRoutes);

app.use('/api/v1', jobRoutes);
app.use('/api/v1/employer-assessments', employerAssessmentRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send("Backend running successfully");
});

  export default app;
