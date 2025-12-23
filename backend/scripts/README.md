This folder contains sample test submissions you can use to exercise the runner and worker locally.

How to use
- Start `redis`, `backend` (dev), and the `worker` process.
- Start the optional HTTP runner if you use that fallback.
- Use the `dispatch_to_runner` internal service or manually POST to the backend endpoint that accepts code submissions.

Config
- `RUNNER_STRICT_COMPARE=1` will perform strict comparisons (only normalize newlines, otherwise exact match).
- `RUNNER_COMPARE_IGNORE_CASE=1` will compare outputs case-insensitively (useful for quick checks).
- `RUNNER_COMPARE_COLLAPSE_WHITESPACE=1` (default) collapses repeated whitespace when comparing.

Files
- `sample_tests.json`: array of sample runs. Each object includes `language`, `code`, and `tests` (with `input` and `expected`).

Examples
- To use the first sample with an HTTP request, POST a submission payload with `code`, `language`, `questionId` and the worker will execute the test cases provided by your question service.

Supported languages (Docker-first)
- `python` (image: `python:3.11-slim`)
- `node` / `js` / `javascript` (image: `node:18-slim`)
- `ts` / `typescript` (image: `node:18-slim`, uses `npx ts-node`)
- `java` (image: `openjdk:17-slim`)
- `cpp` / `c++` (image: `gcc:12`)
- `go` (image: `golang:1.20`)
- `ruby` (image: `ruby:3.1-slim`)
- `csharp` / `cs` (image: `mcr.microsoft.com/dotnet/sdk:7.0`) - requires dotnet SDK image (we create a simple csproj in the container and run it)
 - `c` (image: `gcc:12`)

Building a prebuilt TypeScript image (recommended)
- To avoid `npx`/network failures for TypeScript runs, build the prebuilt image included in the repo.

From the repo root (PowerShell):
```powershell
cd backend\scripts
.\build-node-ts.ps1
```

This creates a local image tagged `hiralent/node-ts:18`. You can override the image used by the dispatcher by setting `RUNNER_TS_IMAGE` to a different tag or image.

Prebuilt Python & Java images
- Python: run `backend/scripts/build-python.ps1` to build `hiralent/python:3.11` which includes `numpy`, `requests`, and `pytest`.
- Java: run `backend/scripts/build-java.ps1` to build `hiralent/java-maven:17` which includes `maven` to support Java builds.

After building, set env overrides if you want the dispatcher to use these images:
```powershell
$env:RUNNER_PY_IMAGE = 'hiralent/python:3.11'
$env:RUNNER_JAVA_IMAGE = 'hiralent/java-maven:17'
```



Notes & caveats
- Docker must be installed on the host to use Docker execution. The dispatcher will fall back to the HTTP runner or local Python runner if Docker is unavailable.
- For TypeScript, the container uses `npx ts-node` which may fetch packages from the network. Consider building a custom image including `ts-node` for fully offline execution.
- For compiled languages (Java, C++, C#), the container needs write access to the mounted workdir so it can produce build artifacts. The dispatcher mounts the workdir read-write for that reason.
