import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

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
import agencyRoutes from './routes/agency.routes';
import adminAgencyRoutes from './routes/admin.agency.routes';
import authRoutes from './routes/auth/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import uploadRoutes from "./routes/upload.routes";
import ocrRoutes from './routes/ocr.routes';
import verificationRunRoutes from './routes/verification.run.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminVerificationRoutes from './routes/admin.verification.routes';
import questionRoutes from './routes/questions/question.routes';
import messageRoutes from './routes/message.routes';
import submissionsRoutes from './routes/submissions';
import executionRoutes from './routes/execution.routes';
import insightsRoutes from './routes/insights.routes';
import jobRoutes from './routes/job.routes';
import employerAssessmentRoutes from './routes/employerAssessment.routes';
import skillRadarRoutes from "./routes/skillRadar.routes";
import mockAssessmentRoutes from "./routes/mockAssessment.routes";
import competeRoutes from "./routes/compete.routes";
import subscriptionRoutes from './routes/subscription.routes';
import schedulerRoutes from "./routes/scraping/scraping.routes";
import internalRoutes from "./routes/internal.routes";
import candidateJobsRoutes from "./routes/candidate/jobs.routes";
import internalCandidateRoutes from "./routes/internal/candidate/candidateSnapshot.routes";
import internalCompanyRoutes from "./routes/internal/company/jobsSnapshot.routes";
import matchingInternalRoutes from "./routes/internal/matching.routes";
import companyCandidateRankingRoutes from "./routes/company.candidateRanking.routes";
import jobApplicationsRoutes from "./routes/candidate/jobApplications.routes";
import externalCandidatesRoutes from "./routes/company.externalCandidates.routes";
import companyInternalCandidatesRoutes from "./routes/company.internalCandidates.routes";

// Mount routes
app.use("/api/v1/agency", agencyRoutes);
app.use('/api/v1/admin', adminAgencyRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/v1/verification/run', verificationRunRoutes);
app.use('/api/v1/auth/sessions', authRoutes);


app.use('/api/v1/messages', messageRoutes);
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path}`);
  next();
});

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
//scraping route
app.use("/api/v1/scraping/scheduler", schedulerRoutes);



// ✅ Admin routes ONLY here (use ADMIN_JWT_SECRET internally)
app.use('/api/v1/admin', adminAuthRoutes);
app.use('/api/v1/admin', adminVerificationRoutes);

app.use('/api/v1', insightsRoutes);
app.use('/api/v1', insightsRoutes);

app.use('/api/v1/', jobRoutes);
app.use('/api/v1/employer-assessments', employerAssessmentRoutes);
app.use("/api/v1", skillRadarRoutes);
app.use("/api/v1", mockAssessmentRoutes);
app.use("/api/v1/compete-challenges", competeRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);



//Candidate (jobs+assessments)
app.use('/api/v1/candidate/jobs', candidateJobsRoutes);
app.use("/api/v1/candidate", jobApplicationsRoutes);
app.use("/internal/matching/candidate", internalCandidateRoutes);
app.use("/internal/matching/company", internalCompanyRoutes);
app.use("/internal/matching", matchingInternalRoutes);
app.use("/api/v1", companyCandidateRankingRoutes);


//Scraping Candidates
app.use("/internal", internalRoutes);
app.use("/api/v1", externalCandidatesRoutes);
app.use("/api/v1", companyInternalCandidatesRoutes);

//candidate cv
// Serve uploaded files statically
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

app.get('/', (req: Request, res: Response) => {
  res.send("Backend running successfully");
});

  export default app;
