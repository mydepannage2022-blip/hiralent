FROM mcr.microsoft.com/powershell:latest

# Install additional utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["pwsh"]
