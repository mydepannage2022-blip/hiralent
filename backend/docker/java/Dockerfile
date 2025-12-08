FROM openjdk:17-slim

# Install maven for building Java projects
RUN apt-get update && apt-get install -y --no-install-recommends maven curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
CMD ["sh"]
