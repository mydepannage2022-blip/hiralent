FROM gcc:12

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates make cmake git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh", "-c", "exec \"$@\"", "--"]
