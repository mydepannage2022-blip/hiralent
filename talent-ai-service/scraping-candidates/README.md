# Scraping Candidates Service

This service ingests candidate profiles from external sources (ATS, imports, public platforms),
normalizes them, deduplicates them, and sends them to the Hiralent backend.

## Responsibilities
- Run sourcing jobs (manual or scheduled)
- Fetch candidates from multiple sources
- Normalize & enrich candidate data
- Deduplicate candidates
- Persist results via internal backend APIs

## Tech
- Python 3.11
- FastAPI
- Redis (jobs + state)
- Poetry

## Run locally
```bash
docker compose up --build
