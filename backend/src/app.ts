import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// ——— CORS ———
// ⚠️ Une seule configuration CORS, AVANT les routes
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://hiralent.vercel.app',
];

// In development allow any localhost origin (convenience for dev servers that sometimes pick a different port)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, Postman) with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // indispensable pour envoyer/recevoir les cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  })
);

// ——— Middlewares globaux ———
app.use(express.json());
app.use(cookieParser());

// Dev: log incoming request origins and paths to help debug CORS/EventSource issues
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    try {
      const origin = (req.headers.origin as string) || '(no-origin)';
      console.debug('[DEV LOG] incoming request', req.method, req.path, 'Origin:', origin);
    } catch {}
    next();
  });
}

// Important derrière un proxy/CDN (Vercel, Nginx) pour que cookie { secure: true } fonctionne
app.set('trust proxy', 1);

// ——— Routes ———
import authRoutes from './routes/auth.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import ocrRoutes from './routes/ocr.routes';
import verificationRunRoutes from './routes/verification.run.routes';
import submissionsRoutes from './routes/submissions';
import executionRoutes from './routes/execution.routes';
import { register } from './lib/metrics';
import devRoutes from './routes/dev.routes';
import healthRoutes from './routes/health.routes';

app.get('/', (_req: Request, res: Response) => {
  res.send('backend running successfully');
});

app.use('/api/ocr', ocrRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company', companyRoutes);
// Verification run endpoints (create/finalize) used by the company dashboard
app.use('/api/v1/verification/run', verificationRunRoutes);
// Code submission routes (code execution submissions)
// Expose submissions under both /api/submissions and /api/v1/submissions
app.use('/api/submissions', submissionsRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1', executionRoutes);

// health
app.use('/api', healthRoutes);

// Dev-only endpoints (mint test JWTs, etc.) - enabled only in non-production and when explicitly allowed
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_MINT === '1') {
  app.use('/api/dev', devRoutes);
}

// Prometheus metrics endpoint (optional)
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const body = await register.metrics();
    res.setHeader('Content-Type', register.contentType);
    res.send(body);
  } catch (e) {
    res.status(500).send('error');
  }
});

export default app;
