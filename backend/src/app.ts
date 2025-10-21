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
import authRoutes from './routes/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import uploadRoutes from "./routes/upload.routes";
import ocrRoutes from './routes/ocr.routes';
import verificationRunRoutes from './routes/verification.run.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminVerificationRoutes from './routes/admin.verification.routes';
import insightsRoutes from './routes/insights.routes';


// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/v1/verification/run', verificationRunRoutes);
// Register admin auth routes
app.use('/api/v1', adminAuthRoutes);
app.use('/api/v1', adminVerificationRoutes);

app.use('/api/v1', insightsRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send("Backend running successfully");
});

  export default app;
