Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerfile = Join-Path $scriptDir "..\docker\dotnet\Dockerfile"
$context = Join-Path $scriptDir "..\docker\dotnet"
Write-Host "Building hiralent/dotnet:7.0 from $dockerfile"
docker build -t hiralent/dotnet:7.0 -f $dockerfile $context
