FROM ubuntu:22.04

# Install GnuCOBOL compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnucobol \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["cobc", "--version"]
