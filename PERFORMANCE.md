# Hiralent Frontend — Navigation Performance Analysis

> **Stack:** Next.js 15, React 19, TanStack Query v5, Framer Motion 12
> **Date:** 2026-03-13
> **Symptom:** Page-to-page navigation feels slow — visible loading delay on every route change

---

## Table of Contents

1. [How navigation works in this app](#1-how-navigation-works-in-this-app)
2. [Root Cause #1 — `cache: "no-store"` on every API call](#2-root-cause-1--cache-no-store-on-every-api-call)
3. [Root Cause #2 — QueryClient has no default staleTime](#3-root-cause-2--queryclient-has-no-default-staletime)
4. [Root Cause #3 — ProfileContext uses `cache: "no-store"` and logs on every state change](#4-root-cause-3--profilecontext-uses-cache-no-store-and-logs-on-every-state-change)
5. [Root Cause #4 — `generateBuildId: Date.now()` breaks browser caching](#5-root-cause-4--generatebuildid-datenow-breaks-browser-caching)
6. [Root Cause #5 — `maplibre-gl.css` loaded on every page globally](#6-root-cause-5--maplibre-glcss-loaded-on-every-page-globally)
7. [Root Cause #6 — No middleware.ts — auth checks are fully client-side](#7-root-cause-6--no-middlewarets--auth-checks-are-fully-client-side)
8. [Root Cause #7 — Duplicate menu arrays recreated on every render](#8-root-cause-7--duplicate-menu-arrays-recreated-on-every-render)
9. [Root Cause #8 — `forceRefresh` has an artificial 100ms delay](#9-root-cause-8--forcerefresh-has-an-artificial-100ms-delay)
10. [Root Cause #9 — Multiple localStorage JSON parses on every mount](#10-root-cause-9--multiple-localstorage-json-parses-on-every-mount)
11. [What is already done well](#11-what-is-already-done-well)
12. [Fix Priority Table](#12-fix-priority-table)
13. [Exact code fixes per file](#13-exact-code-fixes-per-file)

---

## 1. How navigation works in this app

When a user clicks a sidebar link (e.g. from `/company/dashboard` to `/company/dashboard/settings`):

```
User clicks link
      │
      ▼
Next.js router intercepts (client-side navigation, no full page reload)
      │
      ▼
New page component mounts
      │
      ▼
All React Query hooks in that page call their queryFn
      │
      ├─ staleTime = 0 (default) → data is immediately stale → ALWAYS refetches
      │
      ▼
queryFn calls apiFetch()
      │
      ├─ cache: "no-store" → bypasses ALL Next.js / browser HTTP caching
      │
      ▼
Network request goes to backend (localhost:5000 in dev)
      │
      ▼
Response arrives → component renders with real data
      │
      ▼
User sees content (300ms–1500ms later depending on backend)
```

Every single navigation hits the network. The browser never serves anything from cache. This is the core of why navigation feels slow.

---

## 2. Root Cause #1 — `cache: "no-store"` on every API call

**File:** `frontend/src/lib/api/apiClient.ts` — line 35

```ts
// ❌ CURRENT CODE
export async function apiFetch<T>(
  audience: Audience,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAuthToken(audience);

  const res = await fetch(`${BASE}${API_PREFIX}${path}`, {
    ...init,
    headers: { ... },
    cache: "no-store",   // <-- THIS LINE
  });
  ...
}
```

### What `cache: "no-store"` actually does

The `cache` option on `fetch()` maps directly to the HTTP `Cache-Control` request header:

| `cache` value    | Sent header                        | Effect |
|------------------|------------------------------------|--------|
| `"default"`      | *(none)*                           | Browser uses its normal cache rules |
| `"no-store"`     | `Cache-Control: no-store`          | Never read from cache, never write to cache |
| `"force-cache"`  | `Cache-Control: only-if-cached`    | Always use cache, never go to network |
| `"no-cache"`     | `Cache-Control: no-cache`          | Check server for freshness, use cache if unchanged (304) |

`"no-store"` is the most aggressive option. It means:
- The browser will **never** serve this response from its HTTP cache
- The response will **never be written** to the HTTP cache either
- Every call goes all the way to the backend server, every time

### Why this is especially bad here

This app uses TanStack Query (React Query) for all data fetching. React Query already has its own in-memory caching layer. The `cache: "no-store"` on the underlying `fetch()` does not affect React Query's cache — it only affects the browser's HTTP cache layer underneath.

The problem is: when React Query decides a re-fetch is needed (e.g. `staleTime` expired, component remounts), it calls `apiFetch()` again. Because `cache: "no-store"` is set, the browser cannot serve a conditional response (304 Not Modified) — it always does a full round-trip to the backend and downloads the full response body again.

### Interaction with React Query

```
Component mounts
      │
React Query checks its in-memory cache
      │
      ├─ Data exists AND staleTime not expired → returns cached data immediately ✅
      │
      └─ Data is stale OR missing
            │
            ▼
      Calls apiFetch()
            │
      fetch() runs with cache: "no-store"
            │
      HTTP cache? Bypassed entirely
            │
      Network request → backend → full response body
```

Even if the backend returns the exact same data as last time, the browser downloads all of it again. There is no 304 shortcut.

### Fix

```ts
// ✅ FIXED — remove the cache option entirely
export async function apiFetch<T>(
  audience: Audience,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAuthToken(audience);

  const res = await fetch(`${BASE}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    // No cache option — let browser use its default HTTP cache rules
    // React Query's staleTime controls when refetches happen
  });
  ...
}
```

Removing `cache: "no-store"` allows the browser to:
1. Use conditional requests (ETag / If-None-Match) if the backend sends them
2. Cache responses that the backend marks as cacheable
3. Serve 304 responses without downloading the body again

---

## 3. Root Cause #2 — QueryClient has no default staleTime

**File:** `frontend/src/context/Providers.tsx` — line 10

```ts
// ❌ CURRENT CODE
const queryClient = new QueryClient();
// No configuration at all
```

### What `staleTime: 0` (the default) actually means

TanStack Query considers data "stale" as soon as it is fetched. When data is stale, it will be refetched the next time:
- A component mounts that uses that query
- The window regains focus
- The network reconnects

With `staleTime: 0`, **every component mount triggers a background refetch**. In a dashboard with a sidebar + navbar + multiple data-fetching components, this means every navigation to a new page fires 5–15 simultaneous network requests, even if you were just on that page 2 seconds ago.

### Navigation scenario with staleTime: 0

```
User navigates: Dashboard → Settings → Dashboard
                                             │
                                   Component mounts again
                                             │
                                 React Query: is data stale?
                                             │
                                   staleTime = 0 → YES, always
                                             │
                                  Fires ALL queries again
                                  (jobs, notifications, profile,
                                   assessments, team data...)
```

Every return navigation re-downloads everything.

### Fix

```ts
// ✅ FIXED
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,         // 1 minute — data is fresh for 1 min after fetch
      gcTime: 5 * 60 * 1000,        // 5 minutes — keep in memory 5 min after unused
      refetchOnWindowFocus: false,  // don't refetch when tab regains focus
      retry: 1,                     // retry failed requests once
    },
  },
});
```

With `staleTime: 60_000`, if you navigate to a page you visited in the last 60 seconds, React Query returns the cached data **instantly** without any network request. The page appears immediately.

Individual queries can still override this per-query when they need fresher data:
```ts
// Override for a specific query that needs to always be fresh
useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  staleTime: 0,  // always refetch — fine for notifications
});
```

---

## 4. Root Cause #3 — ProfileContext uses `cache: "no-store"` and logs on every state change

**File:** `frontend/src/context/ProfileContext.tsx`

### Problem A — `cache: "no-store"` on profile fetches (lines 135–142)

```ts
// ❌ CURRENT CODE
const [profileRes, completenessRes] = await Promise.all([
  fetch(`${CANDIDATE_BASE}/profile`, {
    method: "GET",
    credentials: "include",
    headers,
    cache: "no-store",   // ← same problem as apiClient
  }),
  fetch(`${CANDIDATE_BASE}/completeness`, {
    method: "GET",
    credentials: "include",
    headers,
    cache: "no-store",   // ← same problem
  }),
]);
```

Additionally, the headers explicitly set:
```ts
"Cache-Control": "no-cache, no-store, must-revalidate",
"Pragma": "no-cache"
```

This sends 3 separate cache-disabling signals on every profile fetch. The browser has no chance to use any cached response.

### Problem B — `console.log` on every state change (lines 216–223)

```ts
// ❌ CURRENT — fires on EVERY profileData or profileCompleteness change
useEffect(() => {
  console.log('📊 ProfileContext State Changed:', {
    hasProfileData: !!profileData,
    hasCompleteness: !!profileCompleteness,
    profileDataKeys: profileData ? Object.keys(profileData) : [],
    completenessScore: profileCompleteness?.overall_score,
    dataVersion
  });
}, [profileData, profileCompleteness, dataVersion]);
```

`Object.keys(profileData)` on every render allocates a new array on every state change. In a context that updates frequently (profile edits, form saves, assessment progress), this fires many times per navigation and blocks the main thread slightly each time.

There are also multiple `console.log` calls inside `refetch()` and `forceRefresh()` that run in production.

### Problem C — `forceRefresh` clears state then waits 100ms (lines 194–213)

```ts
// ❌ CURRENT
const forceRefresh = useCallback(async () => {
  setProfileData(null);          // triggers re-render with null data
  setProfileCompleteness(null);  // triggers another re-render

  await new Promise(resolve => setTimeout(resolve, 100)); // artificial wait

  await refetch();
}, [refetch]);
```

Setting state to null causes any components using `profileData` to briefly show a loading/empty state, then the data comes back. This creates a visible flash. The 100ms `setTimeout` is an artificial delay that serves no purpose.

### Fix

```ts
// ✅ FIXED — remove cache-busting headers from refetch()
const refetch = useCallback(async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const [profileRes, completenessRes] = await Promise.all([
      fetch(`${CANDIDATE_BASE}/profile`, { method: "GET", credentials: "include", headers }),
      fetch(`${CANDIDATE_BASE}/completeness`, { method: "GET", credentials: "include", headers }),
    ]);

    if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
    if (!completenessRes.ok) throw new Error(`Completeness fetch failed: ${completenessRes.status}`);

    const profileJson = await profileRes.json();
    const completenessJson = await completenessRes.json();

    const newProfileData = profileJson?.data?.profile || profileJson?.data || profileJson;
    const newCompletenessData = completenessJson?.data || completenessJson;

    setProfileData(newProfileData);
    setProfileCompleteness(newCompletenessData);
    setDataVersion(prev => prev + 1);

    localStorage.setItem("profileData", JSON.stringify(newProfileData));
    localStorage.setItem("profileCompleteness", JSON.stringify(newCompletenessData));
  } catch (error) {
    console.error("ProfileContext.refetch error:", error);
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

// ✅ FIXED — forceRefresh without artificial delay or flash
const forceRefresh = useCallback(async () => {
  localStorage.removeItem("profileData");
  localStorage.removeItem("profileCompleteness");
  await refetch();
}, [refetch]);

// ✅ FIXED — remove the debug useEffect entirely in production
// Or gate it:
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    console.log('ProfileContext updated, score:', profileCompleteness?.overall_score);
  }
}, [profileData, profileCompleteness, dataVersion]);
```

---

## 5. Root Cause #4 — `generateBuildId: Date.now()` breaks browser caching

**File:** `frontend/next.config.ts` — lines 3–6

```ts
// ❌ CURRENT CODE
const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return Date.now().toString(); // force unique build ID each time
  },
  ...
};
```

### What the build ID is used for

Next.js includes the build ID in all static asset URLs:
```
/_next/static/{BUILD_ID}/chunks/app/company/dashboard/page.js
/_next/static/{BUILD_ID}/css/app/layout.css
```

The build ID is what allows browsers to cache these files forever (they use `Cache-Control: public, max-age=31536000, immutable`). Since the URL changes when the build ID changes, old files can be safely invalidated.

### Why `Date.now()` is destructive

When `generateBuildId` returns `Date.now()`, every `next build` produces a completely different build ID — even if no code changed. This means:
- Every deployment busts 100% of all browser caches for all users
- Users re-download every JS chunk and CSS file on the first page load after any deployment
- There is no way for the CDN or browser to know that `chunk-abc.js` from build `1234567` is identical to `chunk-abc.js` from build `1234568`

The comment says "force unique build ID each time" — but Next.js already does this automatically based on content hashes. This override is unnecessary and actively harmful.

### Fix

```ts
// ✅ OPTION 1 — Remove it entirely (Next.js content-based hashing is correct default)
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// ✅ OPTION 2 — Use git commit hash for reproducible, traceable builds
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    try {
      return execSync("git rev-parse HEAD").toString().trim();
    } catch {
      return `fallback-${Date.now()}`;
    }
  },
  images: { ... },
};
```

Option 1 is recommended. Next.js's default build ID is a hash of all page files — it only changes when code actually changes, which is exactly what you want.

---

## 6. Root Cause #5 — `maplibre-gl.css` loaded on every page globally

**File:** `frontend/app/layout.tsx` — line 8

```ts
// ❌ CURRENT CODE — root layout, affects ALL pages
import "maplibre-gl/dist/maplibre-gl.css";
```

### What this imports

`maplibre-gl.css` is approximately **50KB minified** (~13KB gzipped). It contains all the styles for map popups, controls, markers, tooltips, etc. It is loaded on every single page of the app — the login page, the search page, the settings page, every dashboard page — regardless of whether any map is rendered.

Because it is a CSS import in the root layout, it is included in the critical CSS bundle and blocks rendering until it is parsed.

### How many pages actually use a map?

Based on the codebase, maps appear in a small number of candidate profile or location-related pages. The vast majority of pages (all dashboards, auth pages, assessment pages) never render a map.

### Fix

Remove the import from `layout.tsx` and add it only inside the component(s) that actually render a map:

```ts
// ✅ In layout.tsx — REMOVE this line:
// import "maplibre-gl/dist/maplibre-gl.css";   ← DELETE

// ✅ In the map component (e.g. LocationMap.tsx or wherever MapLibre is used):
"use client";
import "maplibre-gl/dist/maplibre-gl.css";  // loaded only when this component mounts
import maplibregl from "maplibre-gl";
...
```

This way the CSS is only downloaded and parsed when a user actually navigates to a page with a map.

---

## 7. Root Cause #6 — No middleware.ts — auth checks are fully client-side

**File:** Does not exist — `frontend/middleware.ts` is missing

### Current auth flow

```
User navigates to /company/dashboard/settings
          │
Next.js serves the page HTML (skeleton with no data)
          │
Browser downloads and executes JS bundle
          │
React hydrates
          │
<ProtectedRoute> component mounts
          │
Reads from localStorage (synchronous, fast)
          │
   ├─ Token exists → renders children → page shows
   │
   └─ No token → router.push("/auth/login") → REDIRECT
                      │
              Another page load cycle
```

Even in the happy path (user is logged in), there is a mandatory hydration step before the page can render. During this time, users see either a blank page or a spinner, depending on what `<ProtectedRoute>` renders while checking.

### With middleware.ts

```
User navigates to /company/dashboard/settings
          │
Next.js middleware runs AT THE EDGE (before JS, before HTML)
          │
Reads cookie (not localStorage — cookies are accessible at edge)
          │
   ├─ Cookie valid → request passes through → page renders immediately
   │
   └─ No cookie → 302 redirect to /auth/login (no HTML sent at all)
```

The difference: with middleware, **authenticated users never wait** for hydration. The redirect for unauthenticated users happens before any HTML is sent.

### Why this requires cookies

`middleware.ts` runs on the server/edge and has no access to `localStorage` (browser-only). Auth tokens need to be in cookies to be readable by middleware.

### Implementation

**Step 1 — Set a cookie when logging in** (in `auth.queries.ts`, in the `useLogin` `onSuccess`):

```ts
// After successful login, store token in both localStorage AND a cookie
login(d.user, d.token);

// Set httpOnly-like cookie for middleware (JS-accessible, but same domain)
document.cookie = `authToken=${d.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
```

**Step 2 — Create `frontend/middleware.ts`:**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/company/dashboard",
  "/candidate/dashboard",
  "/agency/dashboard",
];

const AUTH_PATHS = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/company/dashboard/:path*",
    "/candidate/dashboard/:path*",
    "/agency/dashboard/:path*",
    "/auth/login",
    "/auth/signup/:path*",
  ],
};
```

**Step 3 — Clear cookie on logout** (in `AuthContext.tsx`):

```ts
const logout = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  // Clear the middleware cookie too
  document.cookie = "authToken=; path=/; max-age=0";
  setUser(null);
  setToken(null);
};
```

---

## 8. Root Cause #7 — Duplicate menu arrays recreated on every render

**File:** `frontend/app/company/dashboard/layout.tsx` — lines 36–79

```ts
// ❌ CURRENT CODE — runs on every render
export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const defaultMenu = [   // ← new array created on every render
    { name: "Dashboard", icon: LayoutDashboard, href: "/company/dashboard" },
    { name: "Employer Profile", icon: User, href: "..." },
    // ... 10 more items
  ];

  const postJobMenu = [   // ← another new array, IDENTICAL to defaultMenu
    { name: "Dashboard", icon: LayoutDashboard, href: "/company/dashboard" },
    // ... exact same 12 items
  ];

  const menuItems = pathname.startsWith("/company/dashboard/postjob")
    ? postJobMenu
    : defaultMenu;
```

### Two problems

**Problem A — Object recreation on every render:** Both `defaultMenu` and `postJobMenu` are new object/array literals on every render. React performs shallow equality checks, so passing a new array reference to `<DashboardSidebar menuItems={menuItems} />` causes the sidebar to re-render even when nothing visually changed.

**Problem B — The two menus are identical:** Looking at the actual content, `defaultMenu` and `postJobMenu` contain exactly the same 12 items. The switch logic is useless (it compares to `postJobMenu` which is identical to `defaultMenu`).

### Fix

```ts
// ✅ Move menus outside the component — created once, stable references
const DEFAULT_MENU = [
  { name: "Dashboard",        icon: LayoutDashboard,   href: "/company/dashboard" },
  { name: "Employer Profile", icon: User,              href: "/company/dashboard/employer-profile" },
  { name: "Notifications",    icon: Bell,              href: "/company/dashboard/notifications" },
  { name: "My Jobs",          icon: Briefcase,         href: "/company/dashboard/jobManagement" },
  { name: "My Assessments",   icon: CheckSquare,       href: "/company/dashboard/assessmentManagement" },
  { name: "Candidates",       icon: Users,             href: "/company/dashboard/candidates" },
  { name: "AI Interviews",    icon: Video,             href: "/company/dashboard/interviews" },
  { name: "Question Bank",    icon: BookOpen,          href: "/company/dashboard/questions" },
  { name: "Review Queue",     icon: Clock,             href: "/company/dashboard/review-queue" },
  { name: "Team",             icon: UsersRound,        href: "/company/dashboard/team" },
  { name: "Messages",         icon: MessageSquareText, href: "/company/dashboard/messages" },
  { name: "Account Setting",  icon: Settings,          href: "/company/dashboard/settings" },
] as const;

export default function DashboardLayout({ children }) {
  // No more inline menu arrays
  // menuItems is always DEFAULT_MENU — stable reference, no re-render
  return (
    <ProtectedRoute>
      ...
      <DashboardSidebar menuItems={DEFAULT_MENU} ... />
      ...
    </ProtectedRoute>
  );
}
```

---

## 9. Root Cause #8 — `forceRefresh` has an artificial 100ms delay

**File:** `frontend/src/context/ProfileContext.tsx` — lines 194–213

```ts
// ❌ CURRENT CODE
const forceRefresh = useCallback(async () => {
  setProfileData(null);          // → components that read profileData briefly get null
  setProfileCompleteness(null);  // → components that read completeness briefly get null

  await new Promise(resolve => setTimeout(resolve, 100)); // ← artificial 100ms wait

  await refetch();               // → then fetch and set data again
}, [refetch]);
```

### What happens visually

1. `setProfileData(null)` triggers a re-render — components that display profile data briefly show empty/loading state
2. 100ms passes — nothing happens, user sees blank/loading UI
3. `refetch()` finishes — components re-render with real data

This creates a visible flash of empty content and an unnecessary 100ms delay every time profile data is force-refreshed. The `setTimeout` was likely added to "ensure React processed the state clear" but React batches state updates automatically (especially in React 19 with automatic batching), making this delay pointless.

### Fix

```ts
// ✅ No flash, no artificial delay
const forceRefresh = useCallback(async () => {
  localStorage.removeItem("profileData");
  localStorage.removeItem("profileCompleteness");
  // Don't clear state — let refetch() overwrite it directly
  await refetch();
}, [refetch]);
```

---

## 10. Root Cause #9 — Multiple localStorage JSON parses on every mount

**File:** `frontend/src/context/ProfileContext.tsx` — lines 43–72

```ts
// ❌ CURRENT CODE — 3 separate JSON.parse + 3 localStorage reads on every app mount
useEffect(() => {
  if (typeof window === "undefined") return;

  const savedProfileData = localStorage.getItem("profileData");
  if (savedProfileData) {
    try {
      setProfileData(JSON.parse(savedProfileData));         // parse #1
    } catch {
      localStorage.removeItem("profileData");
    }
  }

  const savedProfileCompleteness = localStorage.getItem("profileCompleteness");
  if (savedProfileCompleteness) {
    try {
      setProfileCompleteness(JSON.parse(savedProfileCompleteness));  // parse #2
    } catch {
      localStorage.removeItem("profileCompleteness");
    }
  }

  const savedAssessmentState = localStorage.getItem("assessmentState");
  if (savedAssessmentState) {
    try {
      setAssessmentStateInternal(JSON.parse(savedAssessmentState));  // parse #3
    } catch {
      localStorage.removeItem("assessmentState");
    }
  }
}, []);
```

Additionally, there are 3 separate `useEffect` hooks that write to localStorage on every state change:

```ts
useEffect(() => {
  if (typeof window !== "undefined" && profileData) {
    localStorage.setItem("profileData", JSON.stringify(profileData));  // stringify on every change
  }
}, [profileData]);

useEffect(() => {
  if (typeof window !== "undefined" && profileCompleteness) {
    localStorage.setItem("profileCompleteness", JSON.stringify(profileCompleteness));
  }
}, [profileCompleteness]);

useEffect(() => {
  if (typeof window !== "undefined" && assessmentState) {
    localStorage.setItem("assessmentState", JSON.stringify(assessmentState));  // assessmentState changes VERY frequently (every question answer, every timer tick)
  }
}, [assessmentState]);
```

The `assessmentState` sync is particularly expensive — assessment state updates frequently during active assessments (current question index, timer), triggering a `JSON.stringify` + `localStorage.setItem` on every update.

### Fix

```ts
// ✅ Consolidate reads into a single function, batch with useMemo
useEffect(() => {
  if (typeof window === "undefined") return;

  // Batch all reads
  const items = ["profileData", "profileCompleteness", "assessmentState"]
    .map((key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        localStorage.removeItem(key);
        return null;
      }
    });

  if (items[0]) setProfileData(items[0]);
  if (items[1]) setProfileCompleteness(items[1]);
  if (items[2]) setAssessmentStateInternal(items[2]);
}, []);

// ✅ Throttle assessmentState localStorage writes — don't write on every timer tick
// Only write on meaningful changes (question change, completion)
// Remove the auto-sync useEffect for assessmentState entirely
// and write manually in updateAssessmentProgress only when question changes:
const updateAssessmentProgress = useCallback((progress) => {
  setAssessmentStateInternal((prev) => {
    const next = { ...prev, currentAssessment: prev.currentAssessment ? { ...prev.currentAssessment, ...progress } : null };
    // Only persist when question index changes, not on every timer tick
    if (progress.currentQuestionIndex !== prev.currentAssessment?.currentQuestionIndex) {
      localStorage.setItem("assessmentState", JSON.stringify(next));
    }
    return next;
  });
}, []);
```

---

## 11. What is already done well

These things are correctly implemented and should not be changed:

| What | Where | Why it's good |
|------|-------|---------------|
| Per-query `staleTime` set on most queries | Individual `*.queries.ts` files | Reduces unnecessary refetches even without global default |
| `refetchOnWindowFocus: false` on most queries | Individual `*.queries.ts` files | Prevents refetch when user switches browser tabs |
| Retry logic that skips 401 errors | Individual `*.queries.ts` files | Prevents infinite retry loops on auth failures |
| `dynamic()` imports for Monaco editor | Assessment pages | Heavy code editor only loads when needed |
| `ProfileContext` initializes from localStorage | `ProfileContext.tsx` | Users see profile data immediately, before any network request |
| Parallel profile + completeness fetches | `ProfileContext.tsx` refetch | Halves the time compared to sequential fetches |
| Google Fonts loaded via `next/font` | `layout.tsx` | Font is self-hosted, no external network request for fonts |
| QueryClient is module-level singleton | `Providers.tsx` | Cache persists across navigations (even if config is missing) |

---

## 12. Fix Priority Table

| # | Root Cause | File | Effort | Impact | Risk |
|---|-----------|------|--------|--------|------|
| 1 | Remove `cache: "no-store"` from `apiFetch` | `apiClient.ts` | 1 min | Very High | Very Low |
| 2 | Add global `staleTime` to QueryClient | `Providers.tsx` | 2 min | Very High | Very Low |
| 3 | Remove `generateBuildId: Date.now()` | `next.config.ts` | 1 min | High | Very Low |
| 4 | Move `maplibre-gl.css` to map component only | `layout.tsx` + map component | 5 min | Medium | Low |
| 5 | Remove `cache: "no-store"` from ProfileContext | `ProfileContext.tsx` | 2 min | Medium | Low |
| 6 | Remove debug `console.log` useEffect | `ProfileContext.tsx` | 1 min | Low-Medium | Very Low |
| 7 | Move menu arrays outside DashboardLayout | `company/dashboard/layout.tsx` | 5 min | Low-Medium | Very Low |
| 8 | Fix `forceRefresh` (remove delay + null flash) | `ProfileContext.tsx` | 2 min | Low | Very Low |
| 9 | Throttle assessmentState localStorage writes | `ProfileContext.tsx` | 10 min | Low | Low |
| 10 | Add `middleware.ts` + cookie auth | New file + `auth.queries.ts` + `AuthContext.tsx` | 30 min | Medium | Medium |

**Quick wins** (items 1–3): ~4 minutes of changes, dramatic improvement in navigation speed.

---

## 13. Exact code fixes per file

### `frontend/src/lib/api/apiClient.ts`

```ts
// REMOVE line 35:
cache: "no-store",
// That's it. Nothing else to change in this file.
```

---

### `frontend/src/context/Providers.tsx`

```ts
// REPLACE:
const queryClient = new QueryClient();

// WITH:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

### `frontend/next.config.ts`

```ts
// REMOVE the generateBuildId block entirely:
// BEFORE:
const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return Date.now().toString();
  },
  images: { ... },
};

// AFTER:
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
```

---

### `frontend/app/layout.tsx`

```ts
// REMOVE line 8:
import "maplibre-gl/dist/maplibre-gl.css";

// ADD to whichever component actually renders the map (e.g. LocationMapComponent.tsx):
import "maplibre-gl/dist/maplibre-gl.css";
```

---

### `frontend/src/context/ProfileContext.tsx`

```ts
// 1. In refetch() — remove cache-busting headers (lines 117–121):
// REMOVE:
"Cache-Control": "no-cache, no-store, must-revalidate",
"Pragma": "no-cache"

// 2. In refetch() fetch calls — remove cache: "no-store" (lines 135, 142)
// REMOVE from both fetch() calls:
cache: "no-store",

// 3. forceRefresh — remove artificial delay (lines 207–208):
// REMOVE:
await new Promise(resolve => setTimeout(resolve, 100));
// REMOVE:
setProfileData(null);
setProfileCompleteness(null);
// (these two lines cause a flash — let refetch overwrite directly)

// 4. Remove or gate the debug useEffect (lines 216–224):
// REMOVE entirely, or wrap in dev check:
useEffect(() => {
  if (process.env.NODE_ENV !== "development") return;
  console.log('ProfileContext updated');
}, [profileData, profileCompleteness, dataVersion]);
```

---

### `frontend/app/company/dashboard/layout.tsx`

```ts
// Move menu definitions above the component function:

const DEFAULT_MENU = [
  { name: "Dashboard",        icon: LayoutDashboard,   href: "/company/dashboard" },
  { name: "Employer Profile", icon: User,              href: "/company/dashboard/employer-profile" },
  { name: "Notifications",    icon: Bell,              href: "/company/dashboard/notifications" },
  { name: "My Jobs",          icon: Briefcase,         href: "/company/dashboard/jobManagement" },
  { name: "My Assessments",   icon: CheckSquare,       href: "/company/dashboard/assessmentManagement" },
  { name: "Candidates",       icon: Users,             href: "/company/dashboard/candidates" },
  { name: "AI Interviews",    icon: Video,             href: "/company/dashboard/interviews" },
  { name: "Question Bank",    icon: BookOpen,          href: "/company/dashboard/questions" },
  { name: "Review Queue",     icon: Clock,             href: "/company/dashboard/review-queue" },
  { name: "Team",             icon: UsersRound,        href: "/company/dashboard/team" },
  { name: "Messages",         icon: MessageSquareText, href: "/company/dashboard/messages" },
  { name: "Account Setting",  icon: Settings,          href: "/company/dashboard/settings" },
];

// Inside DashboardLayout: remove defaultMenu, postJobMenu, and menuItems logic.
// Pass DEFAULT_MENU directly:
<DashboardSidebar menuItems={DEFAULT_MENU} ... />
// Also remove: const pathname = usePathname() — no longer needed
```

---

*End of document. Total estimated fix time for items 1–8: ~30 minutes.*
