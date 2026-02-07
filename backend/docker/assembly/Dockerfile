FROM gcc:12

# Install NASM assembler and debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nasm \
    gdb \
    binutils \
    curl \
    ca-certificates \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh"]
