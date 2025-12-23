FROM ruby:3.1-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential ca-certificates git curl \
  && gem install bundler --no-document \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

CMD ["sh", "-c", "exec \"$@\"", "--"]
