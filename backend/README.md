# Hiralent – Backend (Express + TypeScript + Prisma + MongoDB) – Updated Documentation

This README is the **definitive, up-to-date guide** for the Hiralent backend. It covers every implemented feature, folder, and workflow as of September 2025.  
If you’re onboarding or integrating, this is your single source of truth.

---

## 1. Project Overview

Hiralent backend is built with **Express.js**, **TypeScript**, **Prisma ORM** (PostgreSQL), and **MongoDB**.  
It is modular, strictly typed, and designed for scalability, security, and rapid feature development, including AI integrations.

---

## 2. Folder Structure (as of September 2025)

```
backend/
│
├── .env                      # Environment variables (DB, JWT, SMTP, AI, etc.)
├── .env.example              # Example env file for onboarding
├── package.json              # NPM dependencies & scripts
├── tsconfig.json             # TypeScript config
├── config/
│   └── firebase-adminsdk.json   # Firebase admin credentials (if used)
├── prisma/
│   ├── schema.prisma         # Prisma ORM schema (PostgreSQL models)
│   ├── dev.db                # SQLite DB (dev only, if used)
│   └── migrations/           # Prisma migration history
├── src/
│   ├── app.ts                # Express app setup (middleware, error handler, etc.)
│   ├── server.ts             # Server entry point (listen on port)
│   ├── controller/           # All route controllers (business logic)
│   │   ├── auth.controller.ts
│   │   ├── candidate.controller.ts
│   │   ├── company.controller.ts
│   │   ├── candidate/
│   │   └── company/
│   ├── generated/            # Prisma generated client (custom output directory)
│   ├── lib/                  # DB clients & integrations (prisma, mongo, openai, pinecone)
│   │   ├── mongo.ts
│   │   ├── openai.ts
│   │   ├── pinecone.ts
│   │   └── prisma.ts
│   ├── middlewares/          # All Express middlewares (auth, validation, logging, etc.)
│   ├── routes/               # All Express routers (API endpoints)
│   │   ├── auth.routes.ts
│   │   ├── candidate.routes.ts
│   │   └── company.routes.ts
│   ├── services/             # Business logic/services for each domain
│   │   ├── auth.service.ts
│   │   ├── candidate.service.ts
│   │   ├── company.service.ts
│   │   ├── profile.service.ts
│   │   └── candidate/
│   ├── types/                # Custom TypeScript types/interfaces
│   ├── utils/                # Utility/helper functions (email, JWT, etc.)
│   └── validation/           # Zod schemas for validation
├── uploads/
│   └── candidates/           # Uploaded CVs and files (PDF/DOCX)
│       └── images/
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
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` – Firebase config (if used)

---

## 4. Database Layer

### Prisma (PostgreSQL)
- **Location:** `prisma/schema.prisma`
- **Models:** User, CandidateProfile, CompanyProfile, Job, JobApplication, SkillAssessment, Notification, SubscriptionPlan, etc.
- **Usage:** All main business data (users, jobs, applications, assessments, etc.) is stored in PostgreSQL and accessed via Prisma ORM (`src/lib/prisma.ts`). Models are strictly typed and relations are enforced.

### MongoDB
- **Location:** `src/lib/mongo.ts`
- **Usage:** Used for storing file metadata (e.g., CV uploads) and other unstructured data.

### Pinecone (Vector DB)
- **Location:** `src/lib/pinecone.ts`
- **Usage:** Stores and queries vector embeddings for AI-powered job/candidate matching.

---

## 5. Middlewares (`src/middlewares/`)

- **checkAuth.middleware.ts** – Verifies JWT, attaches user to `req.user`.
- **checkRole.middleware.ts** – Restricts access to allowed roles.
- **checkPermission.middleware.ts** – Checks user permission level for a module.
- **validateBody.middleware.ts** – Validates request body using Zod schema.
- **errorHandler.middleware.ts** – Global error handler.
- **logRequests.middleware.ts** – Logs HTTP method, URL, and user ID.
- **ownershipGuard.middleware.ts** – Ensures the current user owns the resource.
- **requestTimer.middleware.ts** – Logs duration (ms) of each request.
- **sanitizeRichText.middleware.ts** – Sanitizes HTML input.
- **statusTransitionValidator.middleware.ts** – Validates allowed status transitions for job applications.
- **uploadCV.middleware.ts** – Handles CV file uploads using Multer.
- **uploadImage.middleware.ts** – Handles image uploads.
- **rateLimiter.middleware.ts** – Limits requests per IP (if enabled).

---

## 6. Utilities (`src/utils/`)

- **email.util.ts** – Sends emails using nodemailer.
- **jwt.util.ts** – Generates and verifies JWT tokens.
- **hash.util.ts** – Hashes and compares passwords.
- **fileMetaExtractor.util.ts** – Extracts metadata from uploaded files.
- **role-permission.util.ts** – Checks if a user role has a specific permission.
- **firebase.ts** – Initializes Firebase Admin SDK (if used).
- **documentParser.util.ts** – PDF/DOCX parsing for CV uploads.
- **openai.ts** – AI integration for skill extraction, job match reasoning.
- **pinecone.ts** – Pinecone vector DB integration.

---

## 7. Validation (`src/validation/`)

All incoming data is validated using **Zod schemas** before reaching controllers.

---

## 8. Controllers (`src/controller/`)

Controllers contain the business logic for each domain.

- **auth.controller.ts** – Handles login, registration, JWT issuance, password reset, etc.
- **candidate.controller.ts** – Handles candidate CV upload, AI profile, job matching, completeness scoring, etc.
- **company.controller.ts** – Handles company profile, job posting, candidate management, etc.
- **candidate/**, **company/** – Domain-specific controllers.

---

## 9. Services (`src/services/`)

Services implement the core business logic for each domain.

- **auth.service.ts** – Auth logic.
- **candidate.service.ts** – Candidate flows (CV upload, AI processing, job matching, etc.).
- **company.service.ts** – Company flows.
- **profile.service.ts** – Profile management.
- **candidate/** – Domain-specific services.

---

## 10. Routes (`src/routes/`)

Express routers define all API endpoints and attach middlewares.

- **auth.routes.ts** – `/api/v1/auth`
- **candidate.routes.ts** – `/api/v1/candidates`
- **company.routes.ts** – `/api/v1/companies`
- (Add more as needed.)

---

## 11. Notable Implemented Features

- **JWT Authentication:** All protected routes require a valid JWT.
- **Role-Based Access Control:** Only users with the correct role can access certain endpoints.
- **Permission Checks:** Fine-grained permission checks for modules.
- **Company & Candidate Flows:**  
  - Company: Profile, job posting, candidate management, subscription/payment.
  - Candidate: CV upload (PDF/DOCX), AI-powered skill extraction, job matching, profile completeness scoring.
- **Job Applications:**  
  - Candidates can submit applications with CV upload.
  - CV metadata stored in MongoDB.
  - Recruiters/admins can update application status.
- **Skill Assessment:**  
  - Adaptive AI skill assessments, scoring, feedback, recommendations.
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
  - Limits requests per IP for abuse prevention (if enabled).

---

## 12. How to Extend

- Add new models to `prisma/schema.prisma` and run `npx prisma migrate dev`.
- Add new routes/controllers/services as needed, following the existing structure.
- Add new middlewares for additional security or business logic.
- Use Zod for all new validation needs.

---

## 13. Developer Onboarding & Best Practices

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

## 14. Getting Started

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
The server will start on the port defined in `.env` (default: 4000).

## 16. Code Execution & Plagiarism (new)

We added a lightweight run worker and services to support code execution, grading and web-plagiarism checks.

- `src/services/externalClients.ts` — wrappers for calls to external teams (Wafaa for test-cases and vector DB; Ihssane for skill radar). Runs in mock mode by default (set `EXTERNALS_MOCK=0` to opt-out).
- `src/services/plagiarism.service.ts` — uses embeddings + vector search from external client to compute a plagiarism score and evidence list.
- `src/services/execution.service.ts` — orchestrates fetching test cases, running them (mock runner), invoking plagiarism check, and updating skill radar.
- `src/workers/run.worker.ts` — poller worker that processes run jobs and persists results to `codeSubmission`.

Run the worker for local development:

```bash
npm run worker:run
```

Environment flags:

- `EXTERNALS_MOCK=1` (default in non-production): use local mock implementations for embeddings, search and test-cases.
- `REDIS_URL` — if present the queue will use bullmq/Redis; otherwise an in-memory queue is used for local testing.


---

## 15. Contact

For questions or support, contact:  
**Huzaifa Iqbal**

---

**This backend README is fully up-to-date as of September 2025. For frontend documentation, see the frontend/README.md.**