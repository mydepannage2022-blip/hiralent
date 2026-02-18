FROM ubuntu:22.04

# Install Nim compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    nim \
    curl \
    ca-certificates \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["nim", "--version"]
