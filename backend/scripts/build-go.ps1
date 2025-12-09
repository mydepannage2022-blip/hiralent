Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerfile = Join-Path $scriptDir "..\docker\go\Dockerfile"
$context = Join-Path $scriptDir "..\docker\go"
Write-Host "Building hiralent/go:1.20 from $dockerfile"
docker build -t hiralent/go:1.20 -f $dockerfile $context
