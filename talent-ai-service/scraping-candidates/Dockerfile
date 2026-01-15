FROM python:3.11-slim

WORKDIR /app

# (Optionnel mais pratique) évite le buffering + logs plus propres
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Installer dépendances système minimales (souvent utile pour httpx/ssl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Installer les deps Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier ton code
COPY app ./app

# Pas de CMD obligatoire ici (docker-compose fournit command)
