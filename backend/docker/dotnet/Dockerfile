FROM mcr.microsoft.com/dotnet/sdk:7.0

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh", "-c", "exec \"$@\"", "--"]
