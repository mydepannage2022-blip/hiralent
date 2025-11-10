FROM python:3.11-alpine

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=on

WORKDIR /app

# Install system dependencies for spaCy and building
RUN apk add --no-cache \
    build-base \
    curl \
    libffi-dev \
    openssl-dev \
    musl-dev \
    linux-headers

# Copy requirements first
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Remove build dependencies to keep image small
RUN apk del build-base linux-headers

# Copy application code
COPY . .

# Create non-root user
RUN adduser -D app && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "run.py"]