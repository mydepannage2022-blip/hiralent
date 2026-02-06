FROM ubuntu:22.04

# Install Lua and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    lua5.4 \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh"]
