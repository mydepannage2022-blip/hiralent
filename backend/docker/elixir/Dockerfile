FROM elixir:1.15

# Install Erlang and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work

RUN mix local.hex --force && mix local.rebar --force

CMD ["sh"]
