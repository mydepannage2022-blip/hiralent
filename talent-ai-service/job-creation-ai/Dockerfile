# ─────────────────────────────────────────────────────────────
#  FILE LOCATION: talent-ai-service/job-creation-ai/Dockerfile
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# Copy requirements first (Docker caches this layer)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the service
COPY . .

# Expose the port the app runs on
EXPOSE 8003

# Start the FastAPI app with uvicorn (no --reload in production)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003"]