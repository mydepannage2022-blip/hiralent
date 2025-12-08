<#
Build the prebuilt Node+TypeScript image used by the runner.
Run this from project root with PowerShell: `.ackend\scripts\build-node-ts.ps1`
#>
Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerfile = Join-Path $scriptDir "..\docker\node-ts\Dockerfile"
$context = Join-Path $scriptDir "..\docker\node-ts"
Write-Host "Building hiralent/node-ts:18 from $dockerfile"
docker build -t hiralent/node-ts:18 -f $dockerfile $context
param(
  [string]$Tag = "hiralent/node-ts:18"
)

Write-Host "Building image $Tag..."
docker build -t $Tag -f "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\docker\node-ts\Dockerfile" "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\.."
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
Write-Host "Built $Tag"
