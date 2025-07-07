# Talenta – Backend (Express + TypeScript + Prisma + MongoDB) – Complete Documentation

This section documents the **entire backend** of the Talenta project, including all implemented features, folder structure, middlewares, utilities, services, controllers, routes, models, and database integrations. Every detail is included for AI model training and deep developer onboarding.

---

## Backend Structure

```
backend/
│
├── .env                  # Environment variables (DB, JWT, SMTP, etc.)
├── package.json
├── tsconfig.json
├── nodemon.json
├── config/
│   └── firebase-adminsdk.json
├── prisma/
│   ├── schema.prisma     # Prisma ORM schema (PostgreSQL)
│   └── migrations/      # Prisma migrations
└── src/
    ├── app.ts           # Express app setup
    ├── server.ts        # Server entry point
    ├── controller/      # All route controllers
    ├── generated/       # Prisma generated client
    ├── lib/             # DB clients (prisma.ts, mongo.ts)
    ├── middlewares/     # All Express middlewares
    ├── routes/          # All Express routers
    ├── services/        # Business logic/services
    ├── types/           # Custom TypeScript types/interfaces
    ├── utils/           # Utility/helper functions
    └── validation/      # Zod schemas for validation
```

---

## Environment Variables (`.env`)

- `PORT` – Express server port
- `DATABASE_URL` – PostgreSQL connection string (for Prisma)
- `MONGO_URI` – MongoDB connection string (for file metadata, etc.)
- `JWT_SECRET` – Secret for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` – Email sending
- `FRONTEND_URL` – Used in email links

---

## Database Layer

### Prisma (PostgreSQL)
- **Location:** `prisma/schema.prisma`
- **Models:** Agency, User, CandidateProfile, RecruiterProfile, AgencyAdminProfile, RecruiterJob, JobApplication, CandidateProgressTracker, AIInterviewResult, SkillAssessment, Notification, SubscriptionPlan, AgencySubscription, WebhookEndpoint, AdminAuditLog, etc.
- **Usage:** All main business data (users, jobs, agencies, applications, etc.) is stored in PostgreSQL and accessed via Prisma ORM (`src/lib/prisma.ts`).

### MongoDB
- **Location:** `src/lib/mongo.ts`
- **Usage:** Used for storing file metadata (e.g., CV uploads) and other unstructured data.
- **Connection:** Uses `MONGO_URI` and exports a connected DB instance.

---

## Middlewares (`src/middlewares/`)

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

## Utilities (`src/utils/`)

| File                        | Purpose & Details                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------------------|
| `email.util.ts`             | Sends emails using `nodemailer` (SMTP config from `.env`).                                        |
| `jwt.util.ts`               | Generates and verifies JWT tokens.                                                                |
| `hash.util.ts`              | Hashes and compares passwords using `bcrypt`.                                                     |
| `agencyJWT.util.ts`         | Generates special JWTs for agency invitations.                                                    |
| `fileMetaExtractor.util.ts` | Extracts metadata from uploaded files (filename, user, size, etc.) for MongoDB storage.           |
| `role-permission.util.ts`   | Checks if a user role has a specific permission for a module.                                     |
| `firebase.ts`               | Initializes Firebase Admin SDK and verifies Firebase tokens (if used for auth).                   |

---

## Validation (`src/validation/`)

- **Zod schemas** for validating request bodies, e.g.:
  - `user.schema.ts` – User profile creation/update
  - `application.schema.ts` – Job application submit/status update
  - `job.schema.ts` – Job creation/update

---

## Controllers (`src/controller/`)

| File                        | Purpose & Details                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------------------|
| `auth.controller.ts`        | Handles login, registration, JWT issuance, password reset, etc.                                   |
| `agency.controller.ts`      | Agency CRUD, approval, listing, etc.                                                              |
| `agencyAuth.controller.ts`  | Handles agency onboarding, recruiter invitations, admin profile, etc.                             |
| `application.controller.ts` | Handles job application submission, status updates, file metadata storage in MongoDB.             |
| `job.controller.ts`         | Handles job creation, update, and ownership checks.                                               |
| `user.controller.ts`        | Handles user profile CRUD, fetching user details, etc.                                            |

---

## Services (`src/services/`)

- **Business logic** for each domain, e.g.:
  - `agencyAuth.service.ts` – All agency onboarding, approval, recruiter invitation, admin profile logic.
  - `application.service.ts` – Create/update job applications.
  - `job.service.ts` – Create/update jobs.
  - (Other services as needed.)

---

## Routes (`src/routes/`)

- **Express routers** for each domain, e.g.:
  - `auth.routes.ts` – `/api/v1/auth`
  - `agency.routes.ts` – `/api/v1/agency`
  - `user.routes.ts` – `/api/v1/users`
  - `job.route.ts` – `/api/v1/jobs`
  - `application.route.ts` – `/api/v1/applications`
- **Each route** uses relevant middlewares for auth, validation, permissions, etc.

---

## Notable Implemented Features

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

## Example: Agency Onboarding Flow

1. **User creates agency:**  
   - `POST /api/v1/agency`  
   - Agency is created with status "pending".
   - All super admins are notified via email.

2. **Super admin approves agency:**  
   - `PATCH /api/v1/agency/:id/approve`  
   - Agency status set to "active", owner notified via email.

3. **Agency admin invites recruiter:**  
   - `POST /api/v1/agency/invite-recruiter`  
   - Invitation email sent with secure token.

4. **Recruiter accepts invitation:**  
   - Follows link, signs up, joins agency.

---

## Minor Details & Best Practices

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

## How to Extend

- Add new models to `prisma/schema.prisma` and run `npx prisma migrate dev`.
- Add new routes/controllers/services as needed, following the existing structure.
- Add new middlewares for additional security or business logic.
- Use Zod for all new validation needs.

---

## Contact

For questions or support, contact:  
**Huzaifa Iqbal**  
Email: [your-email@example.com]

---

**This backend is fully up-to-date as of July 2025. For frontend documentation, see the next section when available.**