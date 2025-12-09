param(
  [string]$Tag = "hiralent/java-maven:17"
)

Write-Host "Building image $Tag..."
docker build -t $Tag -f "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\docker\java\Dockerfile" "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\.."
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
Write-Host "Built $Tag"
