<#
Dev start helper

Usage: run from PowerShell:
  ./scripts/dev-start.ps1

This script will:
- bring up docker-compose services (Postgres, Redis, MinIO) unless you pass -SkipDockerCompose
- wait for Postgres to be reachable
- ensure a `dev-user` and `local-test` assessment exist in the DB (idempotent)
- open three new PowerShell windows running: backend (dev), worker (dev) and runner-python (uvicorn)

It is intentionally conservative and non-destructive. It requires Docker to be installed and working.
#>

param(
    [switch]$SkipDockerCompose
)

Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Script root: $scriptRoot"

Push-Location $scriptRoot

if (-not $SkipDockerCompose) {
    Write-Host "Starting docker-compose services (in background)..."
    docker-compose up -d
}

# Wait for Postgres to accept connections
$maxWaitSeconds = 90
$elapsed = 0
Write-Host "Waiting for Postgres to accept connections (up to $maxWaitSeconds seconds)..."
while ($elapsed -lt $maxWaitSeconds) {
    try {
        # Quick connection check: run psql -c '\q' inside postgres container to test connectivity
        & docker run --rm -e PGPASSWORD=Azerty1213 postgres:15 psql -h host.docker.internal -U postgres -d hiralent_db -v ON_ERROR_STOP=1 -c "\\q"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Postgres is reachable."
            break
        }
    } catch {
        # ignore
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "Still waiting... $elapsed s"
}

if ($elapsed -ge $maxWaitSeconds) {
    Write-Warning "Postgres did not become ready within $maxWaitSeconds seconds. The script will continue but DB operations may fail."
}

# Idempotent SQL to create dev user and local-test assessment (won't overwrite existing rows)
$sql = @'
INSERT INTO "users" (user_id, email, password_hash, full_name, role, is_email_verified, created_at, updated_at)
VALUES ('dev-user', 'dev-user@example.com', 'devpasshash', 'Dev User', 'candidate', true, now(), now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "skill_assessments" (assessment_id, candidate_id, provider, skill_category, questions, status, created_at, updated_at)
VALUES ('local-test', 'dev-user', 'local-mock', 'programming', '[{"type":"CODING","title":"Hello World","questionId":"q1"}]'::json, 'PENDING', now(), now())
ON CONFLICT (assessment_id) DO NOTHING;
'@

try {
    Write-Host "Applying dev DB data (idempotent)..."
    $null = $sql | docker run --rm -i -e PGPASSWORD=Azerty1213 postgres:15 psql -h host.docker.internal -U postgres -d hiralent_db -v ON_ERROR_STOP=1 -q -f -
    Write-Host "DB upsert completed (or already present)."
} catch {
    Write-Warning "Failed to apply DB inserts. You can run the SQL manually or check Docker networking: $_"
}

Write-Host "Launching backend, worker and runner in new PowerShell windows..."

# Launch backend dev server with dev env overrides (force in-memory queue, runner URL)
Start-Process pwsh -ArgumentList @(
    '-NoExit',
    '-Command',
    "cd '$scriptRoot\\..\\backend'; `$env:FORCE_INMEMORY='1'; `$env:RUNNER_HTTP_URL='http://localhost:8001'; `$env:DEV_BYPASS_CREATE_SUBMISSION='0'; `$env:NODE_ENV='development'; pnpm run dev"
)

# Launch worker dev with same env overrides
Start-Process pwsh -ArgumentList @(
    '-NoExit',
    '-Command',
    "cd '$scriptRoot\\..\\backend'; `$env:FORCE_INMEMORY='1'; `$env:RUNNER_HTTP_URL='http://localhost:8001'; `$env:NODE_ENV='development'; pnpm run worker:dev"
)

# Launch runner python (uvicorn)
Start-Process pwsh -ArgumentList @(
    '-NoExit',
    '-Command',
    "cd '$scriptRoot\\..\\runner-python'; `$env:PYTHONUNBUFFERED='1'; python -m uvicorn http_service:app --host 0.0.0.0 --port 8001 --reload"
)

Pop-Location

Write-Host "All processes started (in new windows). Check logs in those terminals. Submit from the frontend to see live execution and final results.";
