FROM ubuntu:22.04

# Install SBCL (Steel Bank Common Lisp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    sbcl \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sbcl", "--version"]
