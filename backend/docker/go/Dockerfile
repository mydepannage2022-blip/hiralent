FROM golang:1.20

WORKDIR /work

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git curl && rm -rf /var/lib/apt/lists/*

CMD ["sh", "-c", "exec \"$@\"", "--"]
