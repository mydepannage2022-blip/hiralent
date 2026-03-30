from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.enums import DocumentType, ValidationStatus, ValidationResult


class ValidationSignal(BaseModel):
    signal_type: str
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    details: str


class QuickValidationRequest(BaseModel):
    document_id: str
    storage_key: str
    document_type: DocumentType
    mime_type: str
    expected_data: Optional[Dict[str, Any]] = None


class QuickValidationResponse(BaseModel):
    document_id: str
    validation_type: str = "quick"
    status: str
    checks: List[ValidationSignal]
    can_proceed_to_deep_validation: bool
    processing_time_ms: int


class DeepValidationRequest(BaseModel):
    document_id: str
    case_id: Optional[str] = None
    storage_key: str
    document_type: DocumentType
    mime_type: str
    expected_data: Optional[Dict[str, Any]] = None
    callback_url: Optional[str] = None


class DeepValidationQueueResponse(BaseModel):
    validation_job_id: str
    status: str = "queued"
    estimated_completion_seconds: int = 60


class DeepValidationResult(BaseModel):
    validation_job_id: str
    document_id: str
    status: ValidationStatus
    overall_confidence: Optional[float] = None
    overall_status: Optional[ValidationResult] = None
    extracted_data: Optional[Dict[str, Any]] = None
    validation_signals: Optional[List[ValidationSignal]] = None
    issues: Optional[List[Dict[str, Any]]] = None
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None


class HealthCheckComponent(BaseModel):
    status: str
    message: Optional[str] = None


class HealthCheckResponse(BaseModel):
    service: str
    version: str
    status: str
    components: Dict[str, HealthCheckComponent]


class ApiResponse(BaseModel):
    ok: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
