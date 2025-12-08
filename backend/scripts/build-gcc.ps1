Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerfile = Join-Path $scriptDir "..\docker\gcc\Dockerfile"
$context = Join-Path $scriptDir "..\docker\gcc"
Write-Host "Building hiralent/gcc:12 from $dockerfile"
docker build -t hiralent/gcc:12 -f $dockerfile $context
