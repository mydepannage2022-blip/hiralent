# Talenta – Backend (Express + TypeScript + Prisma + MongoDB) – Complete Documentation

This README provides a **comprehensive, end-to-end explanation** of the Talenta backend. It is designed for both AI model training and developer onboarding, so every architectural detail, feature, and workflow is covered in depth.  
If you are a new developer or an AI system, you will understand exactly how the backend works, what modules exist, and how to extend or integrate with it.

---

## 1. Project Purpose & Philosophy

Talenta is a modern, scalable backend for a full-stack talent platform. It is built with **Express.js**, **TypeScript**, **Prisma ORM** (PostgreSQL), and **MongoDB**.  
The codebase is modular, strictly typed, and designed for rapid feature development, security, and future AI integrations.

---

## 2. Folder & File Structure

```
backend/
│
├── .env                  # All environment variables (DB, JWT, SMTP, AI, etc.)
├── package.json          # NPM dependencies and scripts
├── tsconfig.json         # TypeScript config
├── nodemon.json          # Dev hot-reload config
├── config/
│   └── firebase-adminsdk.json   # Firebase admin credentials (optional)
├── prisma/
│   ├── schema.prisma     # Prisma ORM schema (PostgreSQL models)
│   └── migrations/      # Prisma migration history
└── src/
    ├── app.ts           # Express app setup (middleware, error handler, etc.)
    ├── server.ts        # Server entry point (listen on port)
    ├── controller/      # All route controllers (business logic)
    ├── generated/       # Prisma generated client (custom output directory)
    ├── lib/             # DB clients (prisma.ts, mongo.ts, openai.ts, pinecone.ts)
    ├── middlewares/     # All Express middlewares (auth, validation, logging, etc.)
    ├── routes/          # All Express routers (API endpoints)
    ├── services/        # Business logic/services for each domain
    ├── types/           # Custom TypeScript types/interfaces
    ├── utils/           # Utility/helper functions (email, JWT, etc.)
    └── validation/      # Zod schemas for validation
uploads/
    └── candidates/      # Uploaded CVs and files (PDF/DOCX)
```

---

## 3. Environment Variables (`.env`)

All secrets and config are loaded from `.env` for security and flexibility.  
**Key variables:**
- `PORT` – Express server port
- `DATABASE_URL` – PostgreSQL connection string (for Prisma)
- `MONGO_URI` – MongoDB connection string (for file metadata, etc.)
- `JWT_SECRET` – Secret for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` – Email sending
- `FRONTEND_URL` – Used in email links
- `OPENAI_API_KEY`, `GEMINI_API_KEY` – AI integrations
- `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME` – Vector DB
- `UPLOAD_DIR`, `MAX_FILE_SIZE` – File upload config
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` – Firebase config

---

## 4. Database Layer

### Prisma (PostgreSQL)
- **Location:** `prisma/schema.prisma`
- **Models:**  
  - Agency, User, CandidateProfile, RecruiterProfile, AgencyAdminProfile, RecruiterJob, JobApplication, CandidateProgressTracker, AIInterviewResult, SkillAssessment, Notification, SubscriptionPlan, AgencySubscription, WebhookEndpoint, AdminAuditLog, etc.
- **Usage:**  
  - All main business data (users, jobs, agencies, applications, assessments, etc.) is stored in PostgreSQL and accessed via Prisma ORM (`src/lib/prisma.ts`).
  - Models are strictly typed and relations are enforced.

### MongoDB
- **Location:** `src/lib/mongo.ts`
- **Usage:**  
  - Used for storing file metadata (e.g., CV uploads) and other unstructured data.
  - Connection uses `MONGO_URI` and exports a connected DB instance.

### Pinecone (Vector DB)
- **Location:** `src/lib/pinecone.ts`
- **Usage:**  
  - Stores and queries vector embeddings for AI-powered job/candidate matching.
  - Used for semantic search and recommendations.

---

## 5. Middlewares (`src/middlewares/`)

Middlewares are used for security, validation, logging, and business logic enforcement.

| File                                 | Purpose & Details                                                                                   |
|---------------------------------------|-----------------------------------------------------------------------------------------------------|
| `checkAuth.middleware.ts`             | Verifies JWT in `Authorization` header, attaches user to `req.user`, 401 if missing/invalid.        |
| `checkRole.middleware.ts`             | Restricts access to allowed roles (e.g., "admin", "recruiter").                                     |
| `checkPermission.middleware.ts`       | Checks user permission level for a module (uses Prisma for lookup).                                 |
| `validateBody.middleware.ts`          | Validates request body using a Zod schema, 400 if invalid.                                          |
| `errorHandler.middleware.ts`          | Global error handler, logs and sends standardized error responses.                                  |
| `logRequests.middleware.ts`           | Logs HTTP method, URL, and user ID (if available) for each request.                                 |
| `ownershipGuard.middleware.ts`        | Ensures the current user owns the resource (e.g., only job owner can edit job).                     |
| `requestTimer.middleware.ts`          | Logs duration (ms) of each request for performance monitoring.                                      |
| `sanitizeRichText.middleware.ts`      | Sanitizes HTML input (e.g., job descriptions) using `sanitize-html`.                                |
| `statusTransitionValidator.middleware.ts` | Validates allowed status transitions for job applications (e.g., "applied" → "shortlisted").   |
| `uploadCV.middleware.ts`              | Handles CV file uploads using `multer`, stores files and passes metadata to MongoDB.                |

---

## 6. Utilities (`src/utils/`)

Utilities provide reusable helpers for common tasks.

| File                        | Purpose & Details                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------------------|
| `email.util.ts`             | Sends emails using `nodemailer` (SMTP config from `.env`).                                        |
| `jwt.util.ts`               | Generates and verifies JWT tokens.                                                                |
| `hash.util.ts`              | Hashes and compares passwords using `bcrypt`.                                                     |
| `agencyJWT.util.ts`         | Generates special JWTs for agency invitations.                                                    |
| `fileMetaExtractor.util.ts` | Extracts metadata from uploaded files (filename, user, size, etc.) for MongoDB storage.           |
| `role-permission.util.ts`   | Checks if a user role has a specific permission for a module.                                     |
| `firebase.ts`               | Initializes Firebase Admin SDK and verifies Firebase tokens (if used for auth).                   |
| `documentParser.util.ts`    | PDF/DOCX parsing, text extraction, cleaning for CV uploads.                                       |
| `openai.ts`                 | AI integration for skill extraction, career prediction, job match reasoning.                      |
| `pinecone.ts`               | Pinecone vector DB integration for semantic search.                                               |

---

## 7. Validation (`src/validation/`)

All incoming data is validated using **Zod schemas** before reaching controllers.

- `user.schema.ts` – User profile creation/update
- `application.schema.ts` – Job application submit/status update
- `job.schema.ts` – Job creation/update
- `candidate.schema.ts` – Candidate location/salary update
- `assessment.validation.ts` – Skill assessment flows

---

## 8. Controllers (`src/controller/`)

Controllers contain the business logic for each domain.

| File                        | Purpose & Details                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------------------|
| `auth.controller.ts`        | Handles login, registration, JWT issuance, password reset, etc.                                   |
| `agency.controller.ts`      | Agency CRUD, approval, listing, etc.                                                              |
| `agencyAuth.controller.ts`  | Handles agency onboarding, recruiter invitations, admin profile, etc.                             |
| `application.controller.ts` | Handles job application submission, status updates, file metadata storage in MongoDB.             |
| `job.controller.ts`         | Handles job creation, update, and ownership checks.                                               |
| `user.controller.ts`        | Handles user profile CRUD, fetching user details, etc.                                            |
| `candidate.controller.ts`   | Handles candidate CV upload, AI profile, job matching, completeness scoring, etc.                 |
| `assessment.controller.ts`  | Handles skill assessment flows (start, question, answer, progress, results, history, recommendations). |

---

## 9. Services (`src/services/`)

Services implement the core business logic for each domain.

- `agencyAuth.service.ts` – All agency onboarding, approval, recruiter invitation, admin profile logic.
- `application.service.ts` – Create/update job applications.
- `job.service.ts` – Create/update jobs.
- `candidate.service.ts` – CV upload, AI processing, job matching, completeness, vector update.
- `assessment.service.ts` – Skill assessment logic (adaptive questions, scoring, feedback, recommendations).
- (Other services as needed.)

---

## 10. Routes (`src/routes/`)

Express routers define all API endpoints and attach middlewares.

- `auth.routes.ts` – `/api/v1/auth`
- `agency.routes.ts` – `/api/v1/agency`
- `agencyAuth.routes.ts` – `/api/v1/agency-auth`
- `user.routes.ts` – `/api/v1/users`
- `job.routes.ts` – `/api/v1/jobs`
- `application.routes.ts` – `/api/v1/applications`
- `candidate.routes.ts` – `/api/v1/candidates`
- Each route uses relevant middlewares for auth, validation, permissions, etc.

---

## 11. Notable Implemented Features

- **JWT Authentication:** All protected routes require a valid JWT in the `Authorization` header.
- **Role-Based Access Control:** Only users with the correct role can access certain endpoints (e.g., only recruiters can post jobs).
- **Permission Checks:** Fine-grained permission checks for modules (e.g., agency admin, recruiter).
- **Agency Onboarding:**  
  - Agency creation (pending approval by super admin).
  - Super admin approval flow with email notifications.
  - Recruiter invitation via email with secure token.
  - Agency admin profile management.
- **Job Applications:**  
  - Candidates can submit applications with CV upload (PDF).
  - CV metadata stored in MongoDB.
  - Recruiters/admins can update application status (with allowed transitions).
- **Job Management:**  
  - Recruiters can create/update jobs.
  - Ownership guard ensures only job owner can edit.
  - Rich text job descriptions sanitized before saving.
- **Candidate Flow:**  
  - CV upload (PDF/DOCX), AI-powered skill extraction, career prediction, job matching, profile completeness scoring.
  - Pinecone vector DB integration for semantic job matching.
  - AI-powered recommendations and insights.
- **Skill Assessment:**  
  - Adaptive AI skill assessments, question/answer flow, scoring, feedback, recommendations, history.
- **Email Notifications:**  
  - SMTP-based transactional emails for approvals, invitations, etc.
- **Request Logging & Timing:**  
  - All requests are logged with user info and duration.
- **Error Handling:**  
  - Centralized error handler for all routes.
- **Validation:**  
  - All incoming data validated with Zod schemas.
- **File Uploads:**  
  - CV uploads handled with Multer, metadata extracted and stored.
- **Rate Limiting:**  
  - (If enabled) Limits requests per IP for abuse prevention.

---

## 12. Example: Agency Onboarding Flow

1. **User creates agency:**  
   - `POST /api/v1/agency-auth/create-agency`  
   - Agency is created with status "pending".
   - All super admins are notified via email.

2. **Super admin approves agency:**  
   - `PATCH /api/v1/agency-auth/:agencyId/approve`  
   - Agency status set to "active", owner notified via email.

3. **Agency admin invites recruiter:**  
   - `POST /api/v1/agency-auth/invite-recruiter`  
   - Invitation email sent with secure token.

4. **Recruiter accepts invitation:**  
   - Follows link, signs up, joins agency.

---

## 13. Candidate Flow Example

1. **Candidate uploads CV:**  
   - `POST /api/v1/candidates/profile-upload`  
   - File is validated and stored, metadata saved in MongoDB.
   - AI processing extracts skills, predicts career path, updates profile completeness.

2. **Candidate fetches profile summary:**  
   - `GET /api/v1/candidates/profile-summary`  
   - Returns all candidate info, skills, completeness, documents.

3. **Candidate gets job recommendations:**  
   - `GET /api/v1/candidates/match-jobs`  
   - Uses Pinecone vector DB for semantic matching.

4. **Candidate starts skill assessment:**  
   - `POST /api/v1/candidates/start-assessment`  
   - Adaptive questions, scoring, feedback, recommendations.

---

## 14. Minor Details & Best Practices

- **TypeScript everywhere:** All backend code is strictly typed.
- **Environment variables:** All secrets/configs are loaded from `.env`.
- **Prisma migrations:** All DB schema changes are tracked and versioned.
- **MongoDB for unstructured data:** Used for file metadata, not main business data.
- **Zod for validation:** All request bodies are validated before hitting controllers.
- **Sanitization:** All rich text inputs are sanitized to prevent XSS.
- **Ownership checks:** Only resource owners can modify their data.
- **Logging:** All requests and errors are logged for audit and debugging.
- **Error responses:** All errors are returned in a consistent JSON format.
- **File structure:** Code is modular and organized by domain and responsibility.

---

## 15. How to Extend

- Add new models to `prisma/schema.prisma` and run `npx prisma migrate dev`.
- Add new routes/controllers/services as needed, following the existing structure.
- Add new middlewares for additional security or business logic.
- Use Zod for all new validation needs.

---

## 16. Developer & AI Model Onboarding

- **Every module is documented and strictly typed.**
- **All business logic is separated into services and controllers.**
- **Validation, error handling, and logging are enforced everywhere.**
- **All endpoints are RESTful and follow best practices.**
- **AI integrations (OpenAI, Gemini, Pinecone) are ready for advanced features.**
- **File uploads, candidate flows, and skill assessments are fully implemented and tested.**
- **Environment variables and secrets are managed securely.**
- **The codebase is modular, scalable, and easy to extend.**

---

## 17. Contact

For questions or support, contact:  
**Huzaifa Iqbal**  

---

**This backend is fully up-to-date as of July 2025. For frontend documentation, see the next section