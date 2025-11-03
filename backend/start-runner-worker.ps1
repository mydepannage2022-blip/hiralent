Set-Location -LiteralPath 'C:\Users\USER\hiralent\backend'
$env:REDIS_URL = 'redis://localhost:6379'
Write-Host "Starting runner worker (dist)..."
# use ts-node to run the dist TypeScript worker or node if compiled
npx ts-node dist/workers/runnerWorker.ts
