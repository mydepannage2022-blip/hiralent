# Local Dev Setup

This folder contains small PowerShell helpers to simplify local development for the code execution pipeline.

- `dev-env-setup.ps1`: dot-source this to set recommended env vars in your current PowerShell session.
- `seed-dev-data.ps1`: calls backend dev endpoints to ensure a dev user and assessment exist and mint a token.

Quick start

1. Open PowerShell and dot-source the env setup:

```powershell
. .\scripts\dev-env-setup.ps1
```

2. Start the runner stub (if using Python stub):

```powershell
Set-Location .\runner-python
uvicorn http_service:app --host 127.0.0.1 --port 8002 --reload
```

3. Start backend and worker (each in their own terminal):

```powershell
Set-Location .\backend
# (ensure envs are present in session) 
npm run dev
npm run worker:run
```

4. Seed dev data and mint token

```powershell
Set-Location <repo-root>
.\scripts\seed-dev-data.ps1
```

5. Start frontend and paste the token into browser localStorage (key: `authToken`), then open `/code-run`.

Optional: automatic dev token injection

If you prefer the dev token to be injected automatically from an env var, set `NEXT_PUBLIC_DEV_TOKEN` before starting Next. The app includes a small dev helper that will place the token into `localStorage` (key `authToken` by default) or into a cookie.

- To set the token and start Next:

```powershell
$Env:NEXT_PUBLIC_DEV_TOKEN = '<JWT>'
# optionally change key or storage
$Env:NEXT_PUBLIC_DEV_TOKEN_KEY = 'authToken'
$Env:NEXT_PUBLIC_DEV_TOKEN_STORE = 'localStorage'   # or 'cookie'
pnpm dev
```

The helper only runs in non-production builds and will reload the page once after setting the token.
