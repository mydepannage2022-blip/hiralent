#!/usr/bin/env bash
set -e

# If you need to load spaCy model at runtime, uncomment:
# python - <<'PY'
# import spacy, sys
# spacy.load("en_core_web_sm")
# print("spaCy model OK")
# PY

uvicorn app.main:app --host 0.0.0.0 --port 8000
