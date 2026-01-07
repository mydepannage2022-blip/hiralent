## matching-candidate-job (FastAPI)

### Run locally
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py

### Health
GET http://localhost:8010/health

### Internal auth
Pass header:
X-Service-Key: <SERVICE_API_KEY>
