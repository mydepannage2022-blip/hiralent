# Hiralent – Frontend (Next.js + React + Tailwind) – Updated Documentation

This README is the **definitive, up-to-date guide** for the Hiralent frontend. It covers every implemented feature, folder, and workflow as of September 2025.  
If you’re onboarding or integrating, this is your single source of truth.

---

## 1. Project Overview

Hiralent’s frontend is a **Next.js 14** (App Router) project using **React 19**, **TypeScript**, and **Tailwind CSS**.  
It is modular, strictly typed, and optimized for scalability, maintainability, and seamless backend/AI integration.

---

## 2. Folder Structure (as of September 2025)

```
frontend/
│
├── .env                      # Environment variables (API URLs, etc.)
├── .gitignore                # Git ignore rules
├── components.json           # (Component registry, if used)
├── next-env.d.ts             # Next.js TypeScript env types
├── next.config.ts            # Next.js config
├── package.json              # NPM dependencies & scripts
├── postcss.config.mjs        # PostCSS config (for Tailwind)
├── README.md                 # This documentation
├── tsconfig.json             # TypeScript config
├── public/                   # Static assets (SVGs, images, etc.)
│   ├── *.svg, *.png, *.jpg, *.ico, images/
├── app/                      # Next.js App Router pages & layouts
│   ├── favicon.ico
│   ├── globals.css           # Tailwind & global styles
│   ├── layout.tsx            # Root layout (fonts, Providers)
│   ├── page.tsx              # Main landing page
│   ├── auth/                 # Authentication flows
│   │   ├── companyRegister/
│   │   ├── login/
│   │   ├── logout/
│   │   ├── signup/
│   │   └── verify-email/
│   ├── candidate/            # Candidate flows
│   │   ├── dashboard/
│   │   ├── home/
│   │   └── public-profile/
│   ├── company/              # Company flows
│   │   ├── checkout/
│   │   ├── dashboard/
│   │   ├── discover/
│   │   ├── home/
│   │   ├── pricing/
│   │   └── public-profile/
│   ├── footer/               # Footer-related pages
│   │   ├── helpcenter/
│   │   └── privacypolicy/
│   ├── job/                  # Job flows
│   │   ├── findjob/
│   │   ├── jobdetails/
│   │   └── jobsearch/
│   └── src/                  # Source code (logic, components, context, etc.)
│       ├── components/       # All reusable UI components (see below)
│       ├── constants/        # App-wide constants (enums, config, etc.)
│       ├── context/          # React context providers
│       ├── customhooks/      # Custom React hooks
│       ├── lib/              # API functions & utilities
│       ├── providers/        # Context provider wrappers
│       └── types/            # TypeScript types & interfaces
├── config/                   # App-level config (e.g., authPagesConfig.ts)
├── .next/                    # Next.js build output (auto-generated)
```

---

## 3. Key Features & Modules (Implemented)

- **Authentication**: Login, signup, company registration, email verification, logout (JWT-based, context-managed).
- **Candidate Flows**:
  - Dashboard: Profile completeness, job matches, skill assessments, application tracking.
  - Home: Hero, categories, jobs, steps, companies, achievements, blog, employer info.
  - Public Profile: Shareable candidate profiles.
  - CV Upload: PDF/DOCX upload, triggers backend AI parsing.
- **Company Flows**:
  - Dashboard: Company profile, job postings, candidate management.
  - Discover: Browse candidates.
  - Checkout/Pricing: Subscription/payment flows.
  - Public Profile: Shareable company profiles.
- **Job Flows**:
  - Find Job: Search, filter, and view jobs.
  - Job Details: Full job descriptions, requirements, apply button.
  - Job Search: Advanced search and filtering.
- **Footer Pages**: Help Center, Privacy Policy.
- **Reusable Components**: Navbar, Footer, ProtectedRoute, Loader, candidate/company/job widgets, etc.
- **API Integration**: All HTTP handled via Axios, with JWT and error handling.
- **State Management**: AuthContext, React Query for API caching.
- **Styling**: Tailwind CSS, Geist fonts, dark mode ready.
- **UX**: Responsive, animated (framer-motion), icon libraries (lucide-react, react-icons).
- **Error Handling**: User-friendly error and loading states everywhere.
- **TypeScript**: Strict typing across all modules.
- **Testing**: Easily testable with React Testing Library (add tests as needed).
- **Deployment**: Vercel-ready, optimized build.

---

## 4. Environment Variables (`.env`)

- `NEXT_PUBLIC_API_URL` – Base URL for backend API requests
- Add more as needed for features/analytics.

---

## 5. How to Extend

- Add new pages to `app/` and new components to `app/src/components/`.
- Add new API functions to `app/src/lib/`.
- Add new context providers or hooks as needed.
- Use Tailwind for all new styling.
- Update `.env` for new backend endpoints or feature flags.

---

## 6. Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 7. Best Practices

- **TypeScript everywhere**: All code is strictly typed.
- **Modular code**: Components, context, hooks, and API functions are separated by domain.
- **Accessibility**: Semantic HTML and accessible components.
- **Performance**: Fonts optimized, images in `public/`, code splitting.
- **Security**: Secrets/configs in `.env`, JWT in httpOnly cookies or secure storage.

---

## 8. Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vercel Deployment](https://vercel.com/docs)

---

**This README is fully up-to-date as of September 2025. For any new features, follow the same modular and domain-driven structure.**

---

## Dev: Code Runner

I added a small Monaco-powered code runner for local testing at `app/code-run`.

Run it locally:

```powershell
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000/code-run
