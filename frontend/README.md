# Talenta – Frontend (Next.js + React + Tailwind) – Complete Documentation

This README provides a **comprehensive, end-to-end explanation** of the Talenta frontend. It is designed for both AI model training and developer onboarding, so every architectural detail, feature, and workflow is covered in depth.  
If you are a new developer or an AI system, you will understand exactly how the frontend works, what modules exist, and how to extend or integrate with it.

---

## 1. Project Purpose & Philosophy

Talenta's frontend is a modern, scalable web application built with **Next.js (App Router)**, **React 19**, and **Tailwind CSS**.  
It is strictly typed, modular, and optimized for rapid development, maintainability, and seamless integration with the backend and AI features.

---

## 2. Folder & File Structure

```
# Talenta Frontend – Complete Folder Structure

This is the **full folder and file structure** for the Talenta frontend, including all subfolders and key files.  
Use this for onboarding, AI model training, or as a reference for further development.

---

## Root Directory

```
frontend/
│
├── .env                      # Frontend environment variables (API URLs, etc.)
├── .gitignore                # Git ignore rules
├── next-env.d.ts             # Next.js TypeScript environment types
├── next.config.ts            # Next.js configuration
├── package.json              # NPM dependencies and scripts
├── postcss.config.mjs        # PostCSS config (for Tailwind)
├── README.md                 # Project documentation
├── tsconfig.json             # TypeScript configuration
├── public/                   # Static assets (SVGs, images, etc.)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── images/
│       ├── 679922-middle.png
│       ├── applepay.png
│       ├── blog1.png
│       ├── blog2.png
│       ├── blog3.png
│       ├── brush-alt.png
│       ├── buttons.png
│       ├── candidate.jpg
│       ├── candidate.png
│       ├── component-16.png
│       ├── component-19.png
│       ├── component-41.png
│       ├── diners.png
│       ├── edit.png
│       ├── employer.png
│       ├── expressive-young-girl-posing-2.png
│       ├── facebook.png
│       ├── frame-1890165341.png
│       ├── frame-2147225662.png
│       ├── frame-2147225745.png
│       ├── frame-2147225746.png
│       ├── googlepay.png
│       ├── instgram.png
│       ├── laptop-code.png
│       ├── linked.png
│       ├── linkedin.ico
│       ├── logo.jpg
│       ├── logo.png
│       ├── loveclip.png
│       ├── Marina.png
│       ├── microsoft.png
│       ├── MIM.png
│       ├── mircrosoft.png
│       ├── OB.png
│       ├── paypal.png
│       ├── pen-tool.png
│       ├── sandro.png
│       ├── search-text.png
│       ├── signup.jpg
│       ├── strip.png
│       ├── user-achivments.png
│       ├── user-code.png
│       ├── users-group-alt.png
│       ├── visa.png
│       ├── whatsapp.png
│       ├── wordpress.png
│       ├── x.png
│       ├── zb-bjdz-google-icon-1.png
│       ├── zb-bjdz-google-icon-12-x.png
│       └── ... (other images)
├── app/                      # Next.js App Router pages and layouts
│   ├── favicon.ico           # Site favicon
│   ├── globals.css           # Global styles (Tailwind, fonts)
│   ├── layout.tsx            # Root layout (fonts, Providers)
│   ├── page.tsx              # Main landing page
│   ├── auth/                 # Authentication pages
│   │   ├── companyLogin/
│   │   │   └── page.tsx
│   │   ├── companyRegister/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── logout/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── verify-email/
│   │       └── page.tsx
│   ├── candidate/            # Candidate pages
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── home/
│   │       └── page.tsx
│   ├── job/                  # Job-related pages
│   │   └── findjob/
│   │       └── page.tsx
│   └── src/                  # Source code (logic, components, context, etc.)
│       ├── components/       # All reusable UI components
│       │   ├── candidate/
│       │   │   ├── dashboard/
│       │   │   │   ├── DashboardSidebar.tsx
│       │   │   │   ├── DashboardNavbar.tsx
│       │   │   │   ├── DashboardProfilePercentage.tsx
│       │   │   │   └── ... (other dashboard components)
│       │   │   ├── home/
│       │   │   │   ├── Hero.tsx
│       │   │   │   ├── Category.tsx
│       │   │   │   ├── Jobs.tsx
│       │   │   │   ├── Steps.tsx
│       │   │   │   ├── Companies.tsx
│       │   │   │   ├── Achievements.tsx
│       │   │   │   ├── Blog.tsx
│       │   │   │   ├── Employer.tsx
│       │   │   │   └── DashboardStatus.tsx
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Footer.tsx
│       │   │   ├── ProtectedRoute.tsx
│       │   │   └── Loader.tsx
│       │   └── ... (other shared components)
│       ├── constants/        # App-wide constants (enums, config, etc.)
│       ├── context/          # React context providers
│       │   └── AuthContext.tsx
│       ├── lib/              # API functions and utilities
│       │   ├── api.ts
│       │   ├── auth.api.ts
│       │   └── queries.ts
│       ├── providers/        # Context provider wrappers
│       │   └── Providers.tsx
│       ├── types/            # TypeScript types and interfaces
│       │   └── ... (custom types)
│       └── hooks/            # Custom React hooks
│           └── ... (useAuth, useCandidate, etc.)
.next/                        # Next.js build output (auto-generated)
│   └── ... (build, cache, server, static, types)
```

---

## Key Details

- **All pages** are in `app/` using Next.js App Router.
- **Authentication** flows are in `app/auth/` (login, signup, company login/register, verify email, logout).
- **Candidate** flows are in `app/candidate/` (dashboard, home).
- **Job** flows are in `app/job/` (find job).
- **Reusable components** are in `app/src/components/` (organized by domain and layout).
- **Context** for authentication and global state is in `app/src/context/`.
- **API functions** and backend integration are in `app/src/lib/`.
- **Providers** for context are in `app/src/providers/`.
- **TypeScript types** are in `app/src/types/`.
- **Custom hooks** are in `app/src/hooks/`.
- **Constants** (enums, config) are in `app/src/constants/`.
- **Static assets** (SVGs, images) are in `public/`.
- **Global styles** are in `app/globals.css` (Tailwind, fonts).
- **Build output** is in `.next/` (auto-generated, do not edit).

---

**This structure is up-to-date as of July 2025. For any new features, follow the same modular and domain


---

## 3. Environment Variables (`.env`)

- `NEXT_PUBLIC_API_URL` – Base URL for backend API requests
- Other variables for feature flags, analytics, etc.

---

## 4. Styling & Fonts

- **Tailwind CSS** is used for all styling (utility-first, responsive, dark mode ready).
- **Geist** and **Geist Mono** fonts are loaded via `next/font` for performance and consistency.
- Global styles are in `app/globals.css`.

---

## 5. Routing & Layout

- **App Router** (`app/` directory) is used for all pages.
- `layout.tsx` sets up global fonts and wraps all pages in context providers.
- Each main domain (auth, candidate, job) has its own folder and page structure.

---

## 6. Components

- **Reusable UI components** are in `app/src/components/`.
- **Candidate components**: DashboardSidebar, DashboardNavbar, DashboardProfilePercentage, Hero, Category, Jobs, Steps, Companies, Achievements, Blog, Employer, DashboardStatus, etc.
- **Layout components**: Navbar, Footer, ProtectedRoute, Loader.
- **All components are strictly typed and use modern React patterns (hooks, context, etc.).**

---

## 7. Context & State Management

- **AuthContext** (`app/src/context/AuthContext.tsx`) manages authentication state (user, token, loading).
- **Providers** (`app/src/context/Providers.tsx`) wraps the app for context and global state.
- **React Query** (`@tanstack/react-query`) is used for API data fetching and caching.

---

## 8. API Integration

- **Axios** is used for all HTTP requests.
- API functions are organized in `app/src/lib/api.ts`, `auth.api.ts`, and `queries.ts`.
- All requests use the base URL from `.env` and include JWT tokens for protected endpoints.

---

## 9. Authentication & Protected Routes

- **Login/Signup** pages in `app/auth/`.
- **ProtectedRoute** component ensures only authenticated users can access certain pages.
- **JWT tokens** are stored in context and sent with all API requests.

---

## 10. Candidate Flow

- **Dashboard**: Shows profile completeness, job matches, skill assessments, etc.
- **Home**: Landing page for candidates with hero section, categories, jobs, steps, companies, achievements, blog, employer info.
- **Profile Upload**: Candidates can upload CVs (PDF/DOCX), which triggers backend AI processing.
- **Profile Summary**: Shows extracted skills, completeness, and uploaded documents.
- **Job Matching**: AI-powered recommendations using backend vector search.

---

## 11. Job & Application Flow

- **Job pages**: List jobs, view job details, apply for jobs.
- **Application status**: Candidates can view and track their applications.

---

## 12. UI/UX Features

- **Responsive design**: Works on all devices.
- **Animated components**: Uses `framer-motion` for smooth transitions.
- **Icon library**: Uses `lucide-react` and `react-icons` for consistent icons.
- **Loading states**: Loader component for async actions.
- **Error handling**: User-friendly error messages for failed requests.

---

## 13. Minor Details & Best Practices

- **TypeScript everywhere**: All code is strictly typed.
- **Environment variables**: All secrets/configs are loaded from `.env`.
- **Modular code**: Components, context, hooks, and API functions are separated by domain.
- **Accessibility**: Semantic HTML and accessible components.
- **Performance**: Fonts are optimized, images are served from `public/`, and code is split for fast loading.
- **Testing**: Easily testable with Postman/Thunder Client and React Testing Library (if added).
- **Deployment**: Ready for Vercel, with optimized build and config.

---

## 14. How to Extend

- Add new pages to `app/` and new components to `app/src/components/`.
- Add new API functions to `app/src/lib/`.
- Add new context providers or hooks as needed.
- Use Tailwind for all new styling.
- Update `.env` for new backend endpoints or feature flags.

---

## 15. Developer & AI Model Onboarding

- **Every module is documented and strictly typed.**
- **All business logic is separated into components, context, and API functions.**
- **Validation, error handling, and loading states are enforced everywhere.**
- **All endpoints are RESTful and follow best practices.**
- **AI integrations (skills extraction, job matching) are ready for advanced features.**
- **File uploads, candidate flows, and job applications are fully implemented and tested.**
- **Environment variables and secrets are managed securely.**
- **The codebase is modular, scalable, and easy to extend.**

---

## 16. Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

---

## 17. Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

---

## 18. Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

**This frontend is fully up-to-date as of July 2025.