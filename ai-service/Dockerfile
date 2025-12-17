FROM python:3.13-slim

# No .pyc, instant logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies (for some pip packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Project root inside the container
WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ALL your project (including app/, main, etc.)
COPY . .

# FastAPI port
EXPOSE 8000

# 🔥 EXACTLY what you run locally:
CMD ["python", "-m", "app.main"]
