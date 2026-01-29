FROM ubuntu:22.04

# Install Objective-C compiler (GCC with Objective-C support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gobjc \
    gnustep-devel \
    libgnustep-base-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh"]
