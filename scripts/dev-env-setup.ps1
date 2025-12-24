<#
Dot-source this file to set recommended dev env vars in your current PowerShell session.
Usage:
  . .\scripts\dev-env-setup.ps1

This will set env vars for frontend/backend/worker local development.
#>

$Env:NEXT_PUBLIC_API_URL = 'http://localhost:5000/api/v1'
$Env:FORCE_INMEMORY = '1'
$Env:ENABLE_DEV_MINT = '1'
$Env:RUNNER_HTTP_URL = 'http://127.0.0.1:8002'

Write-Output "Set envs: NEXT_PUBLIC_API_URL=$Env:NEXT_PUBLIC_API_URL, FORCE_INMEMORY=$Env:FORCE_INMEMORY, ENABLE_DEV_MINT=$Env:ENABLE_DEV_MINT, RUNNER_HTTP_URL=$Env:RUNNER_HTTP_URL"
<#
Dot-source this file to set recommended dev env vars in your current PowerShell session:
. .\scripts\dev-env-setup.ps1
#>

$Env:NEXT_PUBLIC_API_URL = 'http://localhost:5000/api/v1'
$Env:FORCE_INMEMORY = '1'
$Env:ENABLE_DEV_MINT = '1'
$Env:RUNNER_HTTP_URL = 'http://127.0.0.1:8002'

Write-Output "Set envs: NEXT_PUBLIC_API_URL=$Env:NEXT_PUBLIC_API_URL, FORCE_INMEMORY=$Env:FORCE_INMEMORY, ENABLE_DEV_MINT=$Env:ENABLE_DEV_MINT, RUNNER_HTTP_URL=$Env:RUNNER_HTTP_URL"
