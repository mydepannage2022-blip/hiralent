# Integration Guide: AI Service → Real Sandbox Service

## Overview
Replace the mock sandbox (`mock_sandbox_server.py`) with a real gRPC connection to your Sandbox Service.

## Current Setup
- **AI Service** uses `MockSandboxService` (always returns `passed=True`)
- **Sandbox Service** (Youssra) runs on `127.0.0.1:50054` with real test execution
- **Assessment Service** orchestrates vetting workflows

## Goal
Connect AI Service → Real Sandbox Service via gRPC instead of mocking.

---

## Step 1: Environment Configuration

### Create/Update `.env` file

```bash
# filepath: .env
YOUSSRA_EXEC_ADDR=127.0.0.1:50054
USE_MOCK_YOUSSRA=false
SANDBOX_SERVICE_TIMEOUT=30
```

### Update `app/core/config.py`

```python
# filepath: app/core/config.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    YOUSSRA_EXEC_ADDR: str = os.getenv("YOUSSRA_EXEC_ADDR", "127.0.0.1:50054")
    USE_MOCK_YOUSSRA: bool = os.getenv("USE_MOCK_YOUSSRA", "true").lower() == "true"
    SANDBOX_TIMEOUT: int = int(os.getenv("SANDBOX_SERVICE_TIMEOUT", "30"))
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Step 2: Update SandboxClient

Keep your existing `SandboxClient` class but ensure it handles errors properly.

```python
# filepath: app/vetting_pipeline/sandbox_client.py
import grpc
import logging
from typing import Dict, List
from grpc._channel import _InactiveRpcError

from app.grpc import sandbox_pb2, sandbox_pb2_grpc
from app.core.config import settings

logger = logging.getLogger(__name__)

class SandboxClient:
    def __init__(self, sandbox_service_url: str):
        self.sandbox_service_url = sandbox_service_url
        self.logger = logger
        self.channel = None
        self.stub = None
    
    def _ensure_connection(self):
        """Establish gRPC connection"""
        if self.channel is None or self.stub is None:
            self.channel = grpc.insecure_channel(self.sandbox_service_url)
            self.stub = sandbox_pb2_grpc.SandboxServiceStub(self.channel)
    
    def validate_solution(self, question: Dict, timeout: int = None) -> Dict:
        """Send canonical solution to sandbox for validation"""
        self._ensure_connection()
        
        timeout = timeout or settings.SANDBOX_TIMEOUT
        
        try:
            # Build test cases from question payload
            test_cases = []
            for tc in question.get('test_cases', []):
                test_cases.append(
                    sandbox_pb2.TestCase(
                        input=tc.get('input', ''),
                        expected_output=tc.get('expected_output', ''),
                        is_hidden=tc.get('is_hidden', False)
                    )
                )
            
            # Prepare request
            test_request = sandbox_pb2.TestRequest(
                code=question.get('canonical_solution', ''),
                test_cases=test_cases,
                language=question.get('language', 'python')
            )
            
            # Call sandbox service
            response = self.stub.RunTests(test_request, timeout=timeout)
            
            return {
                'all_passed': response.all_passed,
                'test_results': [
                    {
                        'passed': tr.passed,
                        'error_message': tr.error_message
                    } for tr in response.test_results
                ],
                'execution_time': response.execution_time,
                'success': True
            }
            
        except _InactiveRpcError as e:
            self.logger.error(f"gRPC connection error: {e.code()} - {e.details()}")
            return {
                'all_passed': False,
                'test_results': [],
                'success': False,
                'error': f"Sandbox service unavailable: {e.details()}"
            }
        except grpc.RpcError as e:
            self.logger.error(f"gRPC error: {e}")
            return {
                'all_passed': False,
                'test_results': [],
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            self.logger.exception(f"Unexpected error in validate_solution: {e}")
            return {
                'all_passed': False,
                'test_results': [],
                'success': False,
                'error': str(e)
            }
    
    def close(self):
        """Close gRPC connection"""
        if self.channel:
            self.channel.close()
            self.channel = None
            self.stub = None
```

---

## Step 3: Create Sandbox Service Wrapper

Create a service layer that respects mock toggle.

```python
# filepath: app/services/sandbox_service.py
import logging
from typing import Dict
from app.core.config import settings
from app.vetting_pipeline.sandbox_client import SandboxClient

logger = logging.getLogger(__name__)

class SandboxServiceWrapper:
    """
    Wrapper around SandboxClient that respects mock toggle and handles lifecycle.
    """
    
    @staticmethod
    def validate_solution(question: Dict) -> Dict:
        """
        Validate a question's canonical solution against test cases.
        
        Args:
            question: Dict with keys:
                - canonical_solution: str (code)
                - test_cases: List[Dict] with 'input', 'expected_output'
                - language: str (python, javascript, etc.)
        
        Returns:
            Dict with keys:
                - all_passed: bool
                - test_results: List[Dict]
                - success: bool
                - error: str (if failed)
        """
        
        # Respect mock toggle for development
        if settings.USE_MOCK_YOUSSRA:
            logger.info("Mock sandbox enabled — returning success")
            return {
                'all_passed': True,
                'test_results': [
                    {'passed': True, 'error_message': ''} 
                    for _ in question.get('test_cases', [])
                ],
                'success': True,
                'execution_time': 0.01
            }
        
        # Connect to real sandbox service
        client = SandboxClient(settings.YOUSSRA_EXEC_ADDR)
        try:
            result = client.validate_solution(question)
            return result
        finally:
            client.close()
```

---

## Step 4: Update Vetting Pipeline

Replace mock calls with real sandbox validation.

```python
# filepath: app/vetting_pipeline/vetting_pipeline.py
# ...existing code...

from app.services.sandbox_service import SandboxServiceWrapper

class VettingPipeline:
    
    def run_static_validation(self, question: Dict) -> Dict:
        """Run static code checks"""
        # ...existing static validation...
        return {...}
    
    def run_sandbox_validation(self, question: Dict) -> Dict:
        """Run tests in real sandbox service"""
        logger.info(f"Running sandbox validation for question {question.get('id')}")
        
        result = SandboxServiceWrapper.validate_solution(question)
        
        if not result.get('success'):
            logger.error(f"Sandbox validation failed: {result.get('error')}")
        
        return {
            'status': 'APPROVED' if result.get('all_passed') else 'REJECTED',
            'passed_tests': sum(1 for tr in result.get('test_results', []) if tr.get('passed')),
            'total_tests': len(result.get('test_results', [])),
            'execution_time': result.get('execution_time', 0),
            'errors': [tr.get('error_message') for tr in result.get('test_results', []) if not tr.get('passed')]
        }
    
    def vet(self, question: Dict) -> Dict:
        """Full vetting pipeline"""
        
        # Step 1: Static validation
        static_result = self.run_static_validation(question)
        
        # Step 2: Sandbox validation (real service)
        sandbox_result = self.run_sandbox_validation(question)
        
        # Step 3: Quality scoring
        quality_score = self._calculate_quality_score(static_result, sandbox_result)
        
        return {
            'status': 'APPROVED' if quality_score >= 0.7 else 'REJECTED',
            'quality_score': quality_score,
            'static_validation': static_result,
            'sandbox_result': sandbox_result,
            'recommendation': self._generate_recommendation(quality_score)
        }
```

---

## Step 5: Update Main Application

Remove mock sandbox server startup; use real service instead.

```python
# filepath: app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import vetting, questions

# Remove this:
# from app.mock_sandbox_server import serve as serve_mock_sandbox

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting AI Service")
    logger.info(f"Sandbox service: {settings.YOUSSRA_EXEC_ADDR}")
    logger.info(f"Mock sandbox: {settings.USE_MOCK_YOUSSRA}")
    
    # Do NOT start mock sandbox server here
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service")

app = FastAPI(lifespan=lifespan)

# Include routers
app.include_router(vetting.router, prefix="/api/vetting", tags=["vetting"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])

@app.get("/health")
def health():
    return {"status": "ok", "sandbox": settings.YOUSSRA_EXEC_ADDR}
```

---

## Step 6: Testing

### Local Testing (with real Sandbox Service running)

```bash
# Terminal 1: Start Sandbox Service
cd services/sandbox
python -m app.main  # or your sandbox startup command

# Terminal 2: Start AI Service
cd services/ai-service
export YOUSSRA_EXEC_ADDR=127.0.0.1:50054
export USE_MOCK_YOUSSRA=false
python -m uvicorn app.main:app --reload --port 8000

# Terminal 3: Test
curl -X POST http://localhost:8000/api/vetting/validate \
  -H "Content-Type: application/json" \
  -d '{
    "question": {
      "id": "q1",
      "canonical_solution": "print(1+1)",
      "test_cases": [
        {"input": "", "expected_output": "2"}
      ],
      "language": "python"
    }
  }'
```

### Development (with mock)

```bash
export USE_MOCK_YOUSSRA=true
python -m uvicorn app.main:app --reload
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` | Ensure Sandbox Service is running on correct port |
| `gRPC error: unavailable` | Check `YOUSSRA_EXEC_ADDR` environment variable |
| `Timeout errors` | Increase `SANDBOX_SERVICE_TIMEOUT` or check sandbox performance |
| `Proto mismatch` | Regenerate gRPC stubs: `python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. sandbox.proto` |

---

## Architecture Diagram

```
┌─────────────────┐
│ Assessment UI   │
└────────┬────────┘
         │
    HTTP │ POST /vet
         ▼
┌──────────────────────┐
│ Assessment Service   │
└────────┬─────────────┘
         │
    HTTP │ POST /api/vetting/vet
         ▼
┌────────────────────────────┐
│ AI Service                 │
│ ┌──────────────────────┐   │
│ │ VettingPipeline      │   │
│ │ - Static validation  │   │
│ │ - Sandbox validation │◄──┼────┐
│ │ - Quality scoring    │   │    │
│ └──────────────────────┘   │    │
│         │                  │    │
│         │ gRPC            │    │
└─────────┼──────────────────┘    │
          │                       │
          └───────────────────────┘
                ┌──────────────────────┐
                │ Sandbox Service      │
                │ (Youssra)            │
                │ Port: 50054          │
                │ - Test execution     │
                │ - Code validation    │
                └──────────────────────┘
```

---

## Checklist

- [ ] Update `.env` with correct `YOUSSRA_EXEC_ADDR`
- [ ] Set `USE_MOCK_YOUSSRA=false` in production
- [ ] Implement `SandboxClient` with error handling
- [ ] Create `SandboxServiceWrapper` service layer
- [ ] Update `VettingPipeline` to use real sandbox
- [ ] Remove mock sandbox server startup from `main.py`
- [ ] Test with Sandbox Service running
- [ ] Add logging for debugging
- [ ] Set appropriate timeouts
- [ ] Document gRPC proto version

---

## Next Steps

1. **Start Sandbox Service** on correct port
2. **Deploy AI Service** with real sandbox config
3. **Monitor logs** for connection issues
4. **Load test** with realistic question payloads
5. **Add metrics** (execution time, pass rate, etc.)
```

---

**To convert to PDF:**

1. Save this as `INTEGRATION_GUIDE.md` in your project root
2. Use **VS Code Markdown PDF** extension or online converter
3. Or: `pandoc INTEGRATION_GUIDE.md -o INTEGRATION_GUIDE.pdf`

Done! 📄