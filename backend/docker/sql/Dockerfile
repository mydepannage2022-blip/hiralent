FROM postgres:15-alpine

# Install psql and utilities
RUN apk add --no-cache \
    postgresql-client \
    curl \
    ca-certificates

WORKDIR /work

CMD ["psql", "--version"]
