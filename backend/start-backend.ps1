Set-Location -LiteralPath 'C:\Users\USER\hiralent\backend'
$env:REDIS_URL = 'redis://localhost:6379'
$env:MOCK_SANDBOX = '1'
Write-Host "Starting backend server..."
npx ts-node src/server.ts
