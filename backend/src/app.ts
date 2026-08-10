import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import {
  globalLimiter,
  authLimiter,
  ocrLimiter,
  submissionLimiter,
  aiLimiter,
} from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';

dotenv.config();
const app = express();

// Behind a reverse proxy (Railway/Vercel/nginx) the client IP arrives in
// X-Forwarded-For. Trust a bounded number of proxy hops so rate-limit keys and
// req.ip reflect the real client (and express-rate-limit v7 doesn't refuse to
// start on a permissive `trust proxy`). Default 1 hop; override with TRUST_PROXY.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Security headers (Phase 1.5, R-28): HSTS, CSP, X-Content-Type-Options, frame deny.
// crossOriginResourcePolicy is relaxed to 'cross-origin' ON PURPOSE: the signed-file
// route serves CVs/images to the frontend on a different origin, and helmet's default
// (same-origin) would otherwise break those loads.
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS allowlist is env-driven (CORS_ALLOWED_ORIGINS, comma-separated). No wildcard
// with credentials. In non-production we additionally allow any localhost origin for
// developer convenience; production honours ONLY the explicit allowlist.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Requests without an Origin header (Postman, server-to-server, curl health checks).
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
  credentials: true,
  // Pagination metadata is returned via headers (see utils/pagination.util.ts) so the
  // response body shape of list endpoints stays unchanged. A browser can only read these
  // cross-origin if they are on the exposed-headers allowlist.
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit', 'X-Has-More'],
}));

// Global rate limiter (shared via Redis when REDIS_URL is set). Placed before body
// parsing so flood traffic is rejected before we spend cycles parsing it.
app.use(globalLimiter);

// Bounded JSON body — an unbounded parser is a trivial memory-DoS. Oversized bodies
// raise a 413 (see the JSON error handler below). Override the cap with JSON_BODY_LIMIT.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' })); // parse JSON body

// Body-parser oversized-payload errors are handled by the central errorHandler
// (mounted at the very bottom), which emits the standard { success:false, error }
// envelope with a 413 PAYLOAD_TOO_LARGE code — see middlewares/errorHandler.

// Routes
import healthRoutes from './routes/health.routes';
import agencyRoutes from './routes/agency.routes';
import adminAgencyRoutes from './routes/admin.agency.routes';
import authRoutes from './routes/auth/auth.routes';
import sessionRoutes from './routes/auth/session.routes';
import candidateRoutes from './routes/candidate.routes';
import companyRoutes from './routes/company.routes';
import uploadRoutes from "./routes/upload.routes";
import ocrRoutes from './routes/ocr.routes';
import filesRoutes from './routes/files.routes';
import verificationRunRoutes from './routes/verification.run.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import adminVerificationRoutes from './routes/admin.verification.routes';
import adminManagementRoutes from './routes/admin.management.routes';
import questionRoutes from './routes/questions/question.routes';
import messageRoutes from './routes/message.routes';
import notificationPreferencesRoutes from './routes/notificationPreferences.routes';
import submissionsRoutes from './routes/submissions';
import executionRoutes from './routes/execution.routes';
import insightsRoutes from './routes/insights.routes';
import jobRoutes from './routes/job.routes';
import employerAssessmentRoutes from './routes/employerAssessment.routes';
import skillRadarRoutes from "./routes/skillRadar.routes";
import competeRoutes from "./routes/compete.routes";
import subscriptionRoutes from './routes/subscription.routes';
import documentValidationWebhookRoutes from './routes/webhook.documentValidation.routes';

import schedulerRoutes from "./routes/scraping/scraping.routes";
import internalRoutes from "./routes/internal.routes";
import candidateJobsRoutes from "./routes/candidate/jobs.routes";
import internalCandidateRoutes from "./routes/internal/candidate/candidateSnapshot.routes";
import internalCompanyRoutes from "./routes/internal/company/jobsSnapshot.routes";
import matchingInternalRoutes from "./routes/internal/matching.routes";
import companyCandidateRankingRoutes from "./routes/company.candidateRanking.routes";
import jobApplicationsRoutes from "./routes/candidate/jobApplications.routes";
import interviewRoutes from "./routes/interview.routes";
import externalCandidatesRoutes from "./routes/company.externalCandidates.routes";
import companyInternalCandidatesRoutes from "./routes/company.internalCandidates.routes";
import candidateNotificationsRoutes from "./routes/candidate/notifications.routes";
import companyNotificationsRoutes from "./routes/company.notifications.routes";
import assessmentTemplateRoutes from "./routes/company.assessmentTemplate.routes";
import searchRoutes from "./routes/search.routes";
import teamRoutes from './routes/team.routes';
import employerRoutes from './routes/employer.routes';

//Candidate Assessments Space
import assessmentSessionRoutes from "./routes/candidate/assessmentSession.routes";
import assessmentAnswerRoutes from "./routes/candidate/assessmentAnswer.routes";
import assessmentTelemetryRoutes from "./routes/candidate/assessmentTelemetry.routes";
import assessmentExecutionRoutes from "./routes/candidate/assessmentExecution.routes";
import assessmentInsightsRoutes from "./routes/companyAssessmentInsights.routes";
import candidateSimpleTestRoutes from "./routes/candidateSimpleTest.routes";
import candidateInvitesRoutes from "./routes/candidateInvites.routes";
import companyHiringFlowRoutes from "./routes/companyHiringFlow.routes";
import candidateAssessmentHistoryRoutes from "./routes/candidate/assessmentHistory.routes";

// Mount routes
// Health probe first — unauthenticated liveness/readiness (GET /health).
app.use(healthRoutes);
app.use("/api/v1/agency", agencyRoutes);
// ── Admin routers (all share the `/api/v1/admin` prefix; use ADMIN_JWT_SECRET internally) ──
// Keep these THREE mounted ADJACENTLY and in this exact order. Order matters:
//  • adminAuthRoutes is PUBLIC (login/MFA) with no global guard — it MUST come first, or its
//    /auth/login gets shadowed by the guarded routers' `router.use(adminSecurityStack)` and
//    returns 401 "No authorization token provided" (then no superadmin could ever log in).
//  • adminAgencyRoutes (/agencies/*) and adminVerificationRoutes (/verifications/*) are guarded;
//    their paths are disjoint from /auth/*, so adminAuthRoutes never shadows them.
// Do NOT insert any router mounted at bare `/api/v1` with a global guard between these lines.
// adminAuthRoutes is behind authLimiter (like /api/v1/auth) so the now-reachable superadmin
// login can't be brute-forced under only the loose global cap.
app.use('/api/v1/admin', authLimiter, adminAuthRoutes);
app.use('/api/v1/admin', adminAgencyRoutes);
app.use('/api/v1/admin', adminVerificationRoutes);
// Superadmin self-service + platform management (Admins / Settings / Analytics / Security Log).
// Guarded router; paths disjoint from /auth/*, /agencies/*, /verifications/* — mounted here so it
// stays BEFORE the /api/v1 jobRoutes catch-all (otherwise its routes 404-shadow).
app.use('/api/v1/admin', adminManagementRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/company/team', teamRoutes);
app.use('/api/v1/employer', employerRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/ocr', ocrLimiter, ocrRoutes);
app.use('/api/v1/verification/run', verificationRunRoutes);
// Session management (list/terminate own sessions, "sign out other devices" — R-25).
// The REAL session router MUST be mounted here — previously this line re-mounted
// authRoutes by mistake, so every /auth/sessions/* call 404'd and sign-out-other-
// devices was silently dead. session.routes.ts applies its own checkAuth guard.
// Falls through cleanly from the line-above /api/v1/auth authRoutes mount because
// authRoutes has no /sessions/* routes, and sits BEFORE the jobRoutes auth-wall.
// NOTE: no authLimiter here on purpose — the /api/v1/auth mount above ALREADY runs
// authLimiter for this prefix, so adding it again would double-count session calls
// against the strict auth budget (a user managing devices could hit 429 early).
app.use('/api/v1/auth/sessions', sessionRoutes);


app.use('/api/v1/messages', messageRoutes);

// Role-neutral notification toggle preferences (agency/company/candidate).
// Mounted before the jobRoutes '/api/v1/' catch-all so its paths aren't shadowed.
app.use('/api/v1/notification-preferences', notificationPreferencesRoutes);

//Question Bank
app.use('/api/questions', questionRoutes);
app.use('/api/v1/questions', questionRoutes); // ✅ alias pour l'UI

// Submission endpoints (create, fetch). Stricter limiter — POST here enqueues a
// code-runner job. NOTE: the SSE stream lives in executionRoutes and is intentionally
// NOT rate-limited here, so reconnects don't get throttled.
app.use('/api/v1/submissions', submissionLimiter, submissionsRoutes);

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



// NOTE: all three /api/v1/admin routers (adminAuthRoutes, adminAgencyRoutes,
// adminVerificationRoutes) are mounted together, earlier, right after the agency routes.

// AI-cost limiter on the expensive insights compute paths (recompute fans out to
// the AI service). Scoped to the concrete sub-path so it doesn't throttle all of /api/v1.
app.use('/api/v1/companies/:companyId/insights', aiLimiter);
app.use('/api/v1', insightsRoutes);

// Public candidate search — must be mounted BEFORE jobRoutes because
// job.routes.ts has a global router.use(checkAuth) that rejects all
// unauthenticated requests to any /api/v1/* path.
app.use("/api/v1/search", searchRoutes);
// IMPORTANT: Webhooks MUST come before jobRoutes to avoid auth middleware
app.use('/api/v1/webhooks', documentValidationWebhookRoutes);

// Signed file serving (CVs/resumes) — replaces the old public /uploads static mount.
// MUST be mounted BEFORE jobRoutes: job.routes.ts has a global router.use(checkAuth)
// mounted at '/api/v1/' that would otherwise 401 the token-in-URL file requests.
// Access control lives in the signed token itself (routes/files.routes.ts).
app.use('/api/v1/files', filesRoutes);

// Public / service-webhook routers on specific sub-prefixes — MUST be mounted BEFORE
// jobRoutes. job.routes.ts has a global `router.use(checkAuth)` at the bare '/api/v1/'
// mount below that 401s EVERY unauthenticated request to any /api/v1/* path. These two
// routers expose intentionally-public endpoints that would otherwise be shadowed and
// return 401 to their (tokenless, external) callers:
//   • subscription:  GET /plans, GET /plans/:planId (public pricing) and the payment
//                    gateway callback POST /webhook/:gateway — a shadowed webhook means
//                    users can pay and never get upgraded.
//   • compete:       POST /:challenge_id/results — the service results webhook (no auth
//                    by design; the controller enforces its own service key).
// Their own per-route checkAuth still guards the authenticated endpoints inside each.
app.use("/api/v1/compete-challenges", aiLimiter, competeRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

app.use('/api/v1/', jobRoutes);
app.use('/api/v1/employer-assessments', employerAssessmentRoutes);
app.use("/api/v1", assessmentTemplateRoutes);
app.use('/api/v1/employer/assessments/:assessmentId/skill-radar', aiLimiter);
app.use("/api/v1", skillRadarRoutes);
// NOTE: compete-challenges + subscription are mounted EARLIER (before jobRoutes) so their
// public/webhook endpoints aren't shadowed by the jobRoutes global auth wall.



//Candidate (jobs+assessments+interviews)
app.use('/api/v1/candidate/jobs', candidateJobsRoutes);
app.use("/api/v1/candidate", jobApplicationsRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use("/internal/matching/candidate", internalCandidateRoutes);
app.use("/internal/matching/company", internalCompanyRoutes);
app.use("/internal/matching", matchingInternalRoutes);
app.use("/api/v1", companyCandidateRankingRoutes);
app.use("/api/v1", assessmentSessionRoutes);
app.use("/api/v1", assessmentAnswerRoutes);
app.use("/api/v1", assessmentTelemetryRoutes);
app.use("/api/v1", assessmentExecutionRoutes);
app.use("/api/v1", assessmentInsightsRoutes);
// Simple test + Invites + Hiring flow
app.use("/api/v1", candidateInvitesRoutes);
app.use("/api/v1", candidateSimpleTestRoutes);
app.use("/api/v1", companyHiringFlowRoutes);
app.use("/api/v1", candidateAssessmentHistoryRoutes);

//Scraping Candidates
app.use("/internal", internalRoutes);
app.use("/api/v1", externalCandidatesRoutes);
app.use("/api/v1", companyInternalCandidatesRoutes);

// Notifications
app.use("/api/v1", candidateNotificationsRoutes);
app.use("/api/v1", companyNotificationsRoutes);


app.get('/', (req: Request, res: Response) => {
  res.send("Backend running successfully");
});

// ── Terminal middleware (MUST stay last) ───────────────────────────────────
// Any request matching no route above → standard 404 envelope.
app.use(notFoundHandler);
// Any error thrown/next()'d anywhere in the request path — including async
// rejections auto-forwarded by Express 5 — → standard error envelope. No route
// or handler may be mounted after this.
app.use(errorHandler);

  export default app;
