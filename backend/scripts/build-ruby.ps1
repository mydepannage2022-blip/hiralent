Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerfile = Join-Path $scriptDir "..\docker\ruby\Dockerfile"
$context = Join-Path $scriptDir "..\docker\ruby"
Write-Host "Building hiralent/ruby:3.1 from $dockerfile"
docker build -t hiralent/ruby:3.1 -f $dockerfile $context
