# Runner Infra — Build, Hardening & CI

This document outlines the immediate actions, CI steps and hardening recommendations to finalize the runner infra for Hiralent's secure execution environment.

Goals
- Provide a reproducible runner image used to execute candidate code.
- Harden the image and runtime (non-root, healthchecks, minimal surface area).
- Provide CI to build, test and publish runner images.
- Support gVisor (runsc) as a runtime option and runtime flags for production.

Quick summary of changes applied
- Dockerfile: now chowns `/opt/runner`, switches to non-root `runner` user, and adds a lightweight `HEALTHCHECK` that verifies the entrypoint exists.

Files involved
- `runner-python/Dockerfile` — runner image definition (updated)
- `runner-python/entrypoint.py` — python runner entrypoint (already present)
- `backend/src/services/runner.dispatcher.ts` — dispatcher that runs the runner (docker or local)

Build & publish (CI) — example GitHub Actions (suggested)

1. Create a GitHub Actions workflow `.github/workflows/build-runner.yml` that:
   - Builds the runner image using the Dockerfile
   - Runs a basic `docker run` smoke test (local) if secrets allow
   - Pushes the image to your registry (GHCR / Docker Hub) when on `main` or `release` branches

Example steps (pseudo):
- name: Build runner image
  run: docker build -t $REGISTRY/hiralent-runner:${{ github.sha }} runner-python/

- name: Run simple smoke test
  run: |
    docker run --rm -v ${{ runner.temp }}/test:/work:ro --network none $REGISTRY/hiralent-runner:${{ github.sha }} python /opt/runner/entrypoint.py

- name: Push image
  run: docker push $REGISTRY/hiralent-runner:${{ github.sha }}

Note: In CI, use a minimal test fixture (a sample `main.py` + `tests.json`) and mount into `/work` to validate the image.

Runtime configuration notes
- Use `--network none` to disable networking by default. If internet access is required, route through a proxy.
- Use `--cpus` and `--memory` to bound CPU and memory.
- For stronger isolation, use the `runsc` runtime (gVisor). Dispatcher already reads `RUNNER_USE_RUNSC` env and adds `--runtime runsc`.
- Consider running containers with user namespaces and `no-new-privileges` where supported.

k8s deployment (if applicable)
- Create a `Pod`/`Job` spec with the runner image and mount an `emptyDir` and/or `hostPath` with restricted permissions. Use `securityContext` to drop capabilities and run as non-root.

securityContext example snippet

```yaml
securityContext:
  runAsUser: 10001
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

Troubleshooting & healthchecks
- Docker healthcheck added to image verifies `entrypoint.py` existence. For richer checks, consider adding a small `healthcheck.py` that validates Python can execute a trivial runner call.
- Dispatcher should treat healthcheck failures as image-level problems and avoid scheduling jobs to an unhealthy host.

Next steps (implementation backlog)
1. Add GitHub Actions workflow to build and publish the runner image.
2. Add a smoke-test step that mounts a small test package and validates runner output in CI.
3. Add image vulnerability scanning step (e.g., trivy) in CI.
4. Add Kubernetes Job/Pod manifest templates and RBAC notes.
5. Add runtime-level seccomp profiles if running on k8s (PodSecurityPolicy replacement) or using `docker run --security-opt seccomp=/path/to/profile.json`.

Notes
- The Dockerfile change to run as non-root is low-risk but will require CI to confirm image runs correctly in your environment.
- Using gVisor requires `runsc` runtime installed on host and appropriate configuration in Docker or containerd.

If you'd like, I can:
- Add the GitHub Actions workflow file and a small smoke-test fixture (a simple `main.py` + `tests.json`) to run in CI.
- Create Kubernetes Job and Deployment manifests for a runner pool.
- Add a `healthcheck.py` script to the image to run a deeper validation.

Which of the above should I implement next? (I suggest adding the GitHub Actions workflow + smoke test so we have an automated build and basic validation.)
