FROM ocaml/opam:ubuntu-22.04-ocaml-4.14

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Initialize opam and install commonly used packages
RUN opam install -y dune core

CMD ["sh"]
