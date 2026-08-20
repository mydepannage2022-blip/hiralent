# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
#  backend/Dockerfile — Hiralent API image
#
#  Wave 8-lite / W-1 (see hiralent-master-plan/waves/wave-8-lite-staging.md).
#  Target host: Railway. Also usable locally (`docker build -t hiralent-api backend/`).
#
#  Why this file exists: the API had no Dockerfile at all — only Dockerfile.workers
#  (00-CURRENT-STATE.md §8, R-12). Railway's Nixpacks autodetect cannot be trusted here
#  because `canvas` compiles from source and needs the cairo/pango/pixman headers.
#
#  Multi-stage: the C toolchain and the *-dev headers stay in `builder`; the runtime stage
#  carries only the shared libraries those native modules link against.
# ─────────────────────────────────────────────────────────────────────────────


# ══════════════════════════════ builder ══════════════════════════════
# node:20-alpine deliberately mirrors Dockerfile.workers — that apk set is already proven to
# compile this dependency tree. Wave 8 proper pins base images by digest (Phase 8.1); a tag is
# accepted here and recorded as a shortcut.
FROM node:20-alpine AS builder

# python3/make/g++ ... : `canvas` has no musl prebuilds, so it compiles from source.
# openssl                : required by the Prisma query engine on musl.
RUN apk add --no-cache \
      python3 make g++ pkgconf \
      cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev \
      pangomm-dev libjpeg-turbo-dev freetype-dev \
      openssl

WORKDIR /app

# Manifests first: this layer stays cached until the dependency set actually changes, so a
# source-only edit does not re-compile canvas/sharp.
# pnpm-workspace.yaml carries `allowBuilds` (native postinstall allowlist) and the security
# `overrides` — the install is wrong without it.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN corepack enable && pnpm install --frozen-lockfile

# Generate the Prisma client INSIDE the image so `binaryTargets = ["native", "windows"]`
# resolves `native` to the linux-musl engine. A client generated on Windows must never be
# copied in (wave-8-lite-staging.md, gotcha G-8).
# (`postinstall` already runs this; repeated explicitly so the image never depends on
# postinstall behaviour staying the same.)
RUN pnpm exec prisma generate

COPY . .

# `tsc` runs with noEmitOnError:true — a type error FAILS the image build. That is intentional:
# a broken build must never reach staging. Emits dist/src/** (tsconfig rootDir ".").
RUN pnpm build


# ══════════════════════════════ runtime ══════════════════════════════
FROM node:20-alpine AS runtime

# Runtime shared libraries ONLY — no -dev headers, no compiler. These are what the already-built
# canvas/sharp binaries link against, so the alpine version must match the builder stage.
RUN apk add --no-cache \
      cairo jpeg pango giflib pixman libjpeg-turbo freetype \
      openssl

ENV NODE_ENV=production

WORKDIR /app

# node_modules is copied WHOLE and deliberately NOT pruned with `--prod`: the release step (W-3)
# runs `prisma migrate deploy`, and the `prisma` CLI is a devDependency. Pruning it breaks
# migrations, not just tooling. Cost is image size; correctness wins at this stage.
# (The seed itself needs no devDependency — `prisma/` is inside tsconfig's `include`, so the
# release runs the COMPILED `dist/prisma/seed.js` with plain node, never `tsx`.)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# multer and the OCR path write scratch files (UPLOAD_DIR defaults to ./uploads). The process
# runs unprivileged, so the directory must exist and be owned before the USER switch.
# NOTE: this is container-local and ephemeral — persistent artefacts belong in S3/Supabase Storage.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Never run the API as root (R-12).
USER node

# Documentation only. Railway injects its own PORT and server.ts:109 already reads it —
# the port is NOT hardcoded anywhere in the CMD (gotcha G-9).
EXPOSE 5000

# GET /health is the real readiness probe (mounted at app.ts:149; reports db:down as 503).
# Railway uses its own healthcheck setting, but this keeps `docker run` / compose honest.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/health',r=>process.exit(r.statusCode<400?0:1)).on('error',()=>process.exit(1))"

# Single-process entry (W-2): the API **and** the background pollers in one process. Booting
# dist/src/server.js directly would accept work and drain none of it — with no Redis the queues
# are in-memory, so only a poller inside this same process can see them.
#
# server.ts registers SIGTERM/SIGINT handlers and closes the Prisma pool, so node as PID 1 is
# correct here — no init shim needed.
CMD ["node", "dist/src/staging-entry.js"]
