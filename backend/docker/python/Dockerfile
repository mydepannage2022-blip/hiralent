FROM python:3.11-slim

# Install common build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install common packages used in coding exercises
RUN python -m pip install --upgrade pip
RUN pip install numpy requests pytest

WORKDIR /work
CMD ["sh"]
