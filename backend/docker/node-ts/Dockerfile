FROM node:18-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git curl \
  && rm -rf /var/lib/apt/lists/*

# Install TypeScript runtime tools globally to avoid per-run installs
RUN npm install -g ts-node typescript @types/node

WORKDIR /work

CMD ["sh", "-c", "exec \"$@\"", "--"]
FROM node:18-slim

# Preinstall ts-node and TypeScript globally to avoid network installs at runtime
RUN npm install -g ts-node typescript @types/node

WORKDIR /work

CMD ["sh"]
