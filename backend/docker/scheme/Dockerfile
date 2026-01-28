FROM ubuntu:22.04

# Install Racket (Scheme dialect)
RUN apt-get update && apt-get install -y --no-install-recommends \
    racket \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["racket", "--version"]
