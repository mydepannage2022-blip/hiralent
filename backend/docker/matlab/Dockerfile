FROM ubuntu:22.04

# Install GNU Octave (MATLAB-compatible open source alternative)
RUN apt-get update && apt-get install -y --no-install-recommends \
    octave \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["octave", "--version"]
