# Hiralent – Full Stack AI-Ready Project Documentation

A comprehensive, modern full-stack web application using Next.js (frontend) and Express.js with TypeScript (backend). This README is designed for AI model training and deep project understanding, covering every detail of the codebase, especially the backend, including all modules, middlewares, utilities, types, services, and recent updates.

---

## Table of Contents

- [Project Headline](#project-headline)
- [Project Summary](#project-summary)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Backend: End-to-End Details](#backend-end-to-end-details)
  - [Environment Variables](#environment-variables)
  - [Database Layer](#database-layer)
  - [Middlewares](#middlewares)
  - [Utils](#utils)
  - [Validation](#validation)
  - [Types](#types)
  - [Controllers](#controllers)
  - [Services](#services)
  - [Routes](#routes)
  - [Models](#models)
  - [Implemented Features](#implemented-features)
  - [Minor Details & Best Practices](#minor-details--best-practices)
- [Frontend (WIP)](#frontend-wip)
- [Contact](#contact)
- [Notes](#notes)

---

## Project Headline

**Hiralent:**  
A robust, scalable, and interactive full-stack platform built for modern web experiences, leveraging TypeScript on both backend and frontend, with a focus on modularity, maintainability, and AI-readiness.

---

## Project Summary

Hiralent is a full-stack web application that combines a TypeScript-powered Express.js backend with a Next.js frontend. The project delivers a visually rich, highly interactive, and scalable platform, with a clean separation of concerns and best practices for code quality, security, and extensibility. The codebase is structured for easy onboarding, rapid development, and future AI integrations.

---

## Project Structure

```
hiralent/
│
├── backend/
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── controller/
│       ├── generated/
│       ├── lib/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── validation/
│
└── frontend/
    ├── app/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── public/
    ├── styles/
    ├── .eslintrc.json
    ├── next.config.js
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── README.md
```

---

## Tech Stack

- **Backend:** Node.js, Express.js, TypeScript, Prisma (PostgreSQL), MongoDB, dotenv, nodemon
- **Frontend:** Next.js (React, TypeScript), Tailwind CSS, Framer Motion, Lucide Icons, Three.js
- **UI/UX:** Tailwind CSS, Radix UI, Swiper.js (testimonials)
- **Quality:** ESLint, Prettier, TypeScript strict mode
- **Other:** Environment variables, modular file structure, RESTful API

---

## Setup Instructions

### Backend

1. **Install dependencies:**
   ```sh
   cd backend
   pnpm install
   ```
2. **Configure environment:**
   - Copy `.env.example` to `.env` and set your variables (see [Environment Variables](#environment-variables)).
3. **Run the server in development:**
   ```sh
   pnpm run dev
   ```
   (Uses `nodemon` and `ts-node` for hot-reloading TypeScript)
4. **Build and run for production:**
   ```sh
   pnpm run build
   pnpm start
   ```
   The backend runs on `http://localhost:3001` (or as set in `.env`).

### Frontend

> **Note:** Frontend is under active development and will be documented in detail after backend stabilization.

---

## Backend: End-to-End Details

### Environment Variables

- `PORT` – Express server port
- `DATABASE_URL` – PostgreSQL connection string (for Prisma)
- `MONGO_URI` – MongoDB connection string (for file metadata, etc.)
- `JWT_SECRET` – Secret for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` – Email sending
- `FRONTEND_URL` – Used in email links

---

### Database Layer

#### Prisma (PostgreSQL)
- **Models:** Agency, User, CandidateProfile, RecruiterProfile, AgencyAdminProfile, RecruiterJob, JobApplication, CandidateProgressTracker, AIInterviewResult, SkillAssessment, Notification, SubscriptionPlan, AgencySubscription, WebhookEndpoint, AdminAuditLog, etc.
- **Usage:** All main business data (users, jobs, agencies, applications, etc.) is stored in PostgreSQL and accessed via Prisma ORM (`src/lib/prisma.ts`).

#### MongoDB
- **Location:** `src/lib/mongo.ts`
- **Usage:** Used for storing file metadata (e.g., CV uploads) and other unstructured data.
- **Connection:** Uses `MONGO_URI` and exports a connected DB instance.

---

### Middlewares

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

### Utils

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

### Validation

- **Zod schemas** for validating request bodies, e.g.:
  - `user.schema.ts` – User profile creation/update
  - `application.schema.ts` – Job application submit/status update
  - `job.schema.ts` – Job creation/update

---

### Types

- **Custom TypeScript Types:**  
  - User, AuthPayload, APIResponse, Agency-related types, etc.
  - Used for strong typing in controllers, middlewares, and models.

---

### Controllers

| File                        | Purpose & Details                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------------------|
| `auth.controller.ts`        | Handles login, registration, JWT issuance, password reset, etc.                                   |
| `agency.controller.ts`      | Agency CRUD, approval, listing, etc.                                                              |
| `agencyAuth.controller.ts`  | Handles agency onboarding, recruiter invitations, admin profile, etc.                             |
| `application.controller.ts` | Handles job application submission, status updates, file metadata storage in MongoDB.             |
| `job.controller.ts`         | Handles job creation, update, and ownership checks.                                               |
| `user.controller.ts`        | Handles user profile CRUD, fetching user details, etc.                                            |

---

### Services

- **Business logic** for each domain, e.g.:
  - `agencyAuth.service.ts` – All agency onboarding, approval, recruiter invitation, admin profile logic.
  - `application.service.ts` – Create/update job applications.
  - `job.service.ts` – Create/update jobs.
  - (Other services as needed.)

---

### Routes

- **Express routers** for each domain, e.g.:
  - `auth.routes.ts` – `/api/v1/auth`
  - `agency.routes.ts` – `/api/v1/agency`
  - `user.routes.ts` – `/api/v1/users`
  - `job.route.ts` – `/api/v1/jobs`
  - `application.route.ts` – `/api/v1/applications`
- **Each route** uses relevant middlewares for auth, validation, permissions, etc.

---

### Models

- **User Model:**  
  - PostgreSQL schema for user (name, email, password hash, roles, etc.) via Prisma.
- **Agency Model:**  
  - PostgreSQL schema for agency (name, status, owner, etc.).
- **Other Models:**  
  - As needed for jobs, applications, admin profiles, etc.

---

### Implemented Features

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

### Minor Details & Best Practices

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

## Frontend (WIP)

> The frontend (Next.js, React, Tailwind, etc.) is under active development.  
> Full documentation will be added after backend stabilization.

---

## Contact

For questions or support, contact:  
**Huzaifa Iqbal**  
Email: [your-email@example.com]

---

## Notes

- Node.js (v18+) and pnpm must be installed (`corepack enable` provides pnpm).
- Update dependencies regularly for security and new features.
- For any issues, check logs in the terminal or browser console.
- This README is designed for both developer onboarding and AI model training—every detail is included for maximum