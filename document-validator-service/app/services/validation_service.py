"""
Validation Service - Orchestrates document validation pipeline.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

from app.models.schemas import (
    QuickValidationRequest,
    QuickValidationResponse,
    DeepValidationRequest,
    DeepValidationResult,
    ValidationSignal
)
from app.models.enums import DocumentType, ValidationStatus, ValidationResult, SignalType
from app.services.storage import StorageService
from app.core.ocr.engine import OCREngine
from app.core.nlp.extractor import EntityExtractor
from app.config import settings

logger = logging.getLogger(__name__)

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff"
}

# Max file size (15MB)
MAX_FILE_SIZE = 15 * 1024 * 1024

# Page requirements per document type
PAGE_REQUIREMENTS = {
    DocumentType.PASSPORT_COPY: {"min": 1, "max": 3},
    DocumentType.VISA_APPLICATION_FORM: {"min": 1, "max": 10},
    DocumentType.BANK_STATEMENT: {"min": 1, "max": 20},
    DocumentType.EMPLOYMENT_LETTER: {"min": 1, "max": 3},
    DocumentType.ACCOMMODATION_PROOF: {"min": 1, "max": 5},
}


class ValidationService:
    """Orchestrates document validation pipeline."""

    def __init__(self):
        self.storage = StorageService()
        self.ocr_engine = OCREngine()
        self.entity_extractor = EntityExtractor()

    async def validate_quick(self, request: QuickValidationRequest) -> QuickValidationResponse:
        """
        Perform quick synchronous validation (format checks only).

        Checks:
        - File format (MIME type)
        - File size
        - Page count
        """
        start_time = datetime.now()
        signals: List[ValidationSignal] = []

        # 1. Check MIME type
        format_signal = self._check_format(request.mime_type)
        signals.append(format_signal)

        # If format is invalid, return early
        if not format_signal.passed:
            return QuickValidationResponse(
                document_id=request.document_id,
                validation_type="quick",
                status="failed",
                checks=signals,
                can_proceed_to_deep_validation=False,
                processing_time_ms=self._elapsed_ms(start_time)
            )

        # 2. Download file and check size
        try:
            file_buffer = await self.storage.download_file(request.storage_key)
        except FileNotFoundError as e:
            signals.append(ValidationSignal(
                signal_type=SignalType.FILE_SIZE,
                passed=False,
                score=0.0,
                details=f"File not found: {str(e)}"
            ))
            return QuickValidationResponse(
                document_id=request.document_id,
                validation_type="quick",
                status="failed",
                checks=signals,
                can_proceed_to_deep_validation=False,
                processing_time_ms=self._elapsed_ms(start_time)
            )

        # 3. Check file size
        size_signal = self._check_file_size(len(file_buffer))
        signals.append(size_signal)

        # 4. Check page count (for PDFs)
        if request.mime_type == "application/pdf":
            page_signal = await self._check_page_count(
                file_buffer,
                request.mime_type,
                request.document_type
            )
            signals.append(page_signal)

        # Determine overall status
        all_passed = all(s.passed for s in signals)

        return QuickValidationResponse(
            document_id=request.document_id,
            validation_type="quick",
            status="passed" if all_passed else "failed",
            checks=signals,
            can_proceed_to_deep_validation=all_passed,
            processing_time_ms=self._elapsed_ms(start_time)
        )

    async def validate_deep(
        self,
        job_id: str,
        request: DeepValidationRequest
    ) -> DeepValidationResult:
        """
        Perform deep asynchronous validation with OCR + NLP.

        Steps:
        1. Download file
        2. Run OCR
        3. Check OCR confidence
        4. Extract entities
        5. Run document-specific validations
        6. Calculate overall result
        """
        start_time = datetime.now()
        signals: List[ValidationSignal] = []
        issues: List[Dict[str, Any]] = []

        try:
            # 1. Download file
            logger.info(f"[{job_id}] Downloading file: {request.storage_key}")
            file_buffer = await self.storage.download_file(request.storage_key)

            # 2. Run OCR
            logger.info(f"[{job_id}] Running OCR...")
            ocr_result = await self.ocr_engine.extract_text(file_buffer, request.mime_type)
            logger.info(f"[{job_id}] OCR confidence: {ocr_result.confidence:.2f}")

            # 3. Check OCR confidence
            ocr_signal = ValidationSignal(
                signal_type=SignalType.OCR_CONFIDENCE,
                passed=ocr_result.confidence >= settings.OCR_CONFIDENCE_THRESHOLD,
                score=ocr_result.confidence,
                details=f"OCR confidence: {ocr_result.confidence * 100:.1f}% (threshold: {settings.OCR_CONFIDENCE_THRESHOLD * 100:.0f}%)"
            )
            signals.append(ocr_signal)

            if ocr_result.confidence < settings.OCR_CONFIDENCE_THRESHOLD:
                issues.append({
                    "type": "low_ocr_confidence",
                    "severity": "warning",
                    "message": f"Document quality may be low (OCR confidence: {ocr_result.confidence * 100:.1f}%)"
                })

            # 4. Extract entities
            logger.info(f"[{job_id}] Extracting entities...")
            extracted_data = await self.entity_extractor.extract(
                ocr_result.text,
                request.document_type
            )

            # 5. Run document-specific validations
            logger.info(f"[{job_id}] Running validations for {request.document_type}...")
            doc_signals = await self._validate_document_specific(
                request.document_type,
                extracted_data,
                request.expected_data
            )
            signals.extend(doc_signals)

            # 6. Calculate overall result
            overall_confidence = self._calculate_overall_confidence(signals)
            overall_status = self._determine_status(signals, overall_confidence)

            logger.info(f"[{job_id}] Validation complete: {overall_status} ({overall_confidence:.2f})")

            return DeepValidationResult(
                validation_job_id=job_id,
                document_id=request.document_id,
                status=ValidationStatus.COMPLETED,
                overall_confidence=overall_confidence,
                overall_status=overall_status,
                extracted_data=extracted_data,
                validation_signals=[s.model_dump() for s in signals],
                issues=issues,
                processing_time_ms=self._elapsed_ms(start_time)
            )

        except Exception as e:
            logger.error(f"[{job_id}] Validation failed: {e}")
            return DeepValidationResult(
                validation_job_id=job_id,
                document_id=request.document_id,
                status=ValidationStatus.FAILED,
                error_message=str(e),
                processing_time_ms=self._elapsed_ms(start_time)
            )

    def _check_format(self, mime_type: str) -> ValidationSignal:
        """Check if file format is allowed."""
        is_valid = mime_type in ALLOWED_MIME_TYPES
        return ValidationSignal(
            signal_type=SignalType.FORMAT_VALIDATION,
            passed=is_valid,
            score=1.0 if is_valid else 0.0,
            details=f"Format {'accepted' if is_valid else 'not supported'}: {mime_type}"
        )

    def _check_file_size(self, size: int) -> ValidationSignal:
        """Check if file size is within limits."""
        is_valid = size <= MAX_FILE_SIZE
        size_mb = size / (1024 * 1024)
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        return ValidationSignal(
            signal_type=SignalType.FILE_SIZE,
            passed=is_valid,
            score=1.0 if is_valid else 0.0,
            details=f"File size: {size_mb:.1f}MB (max: {max_mb:.0f}MB)"
        )

    async def _check_page_count(
        self,
        file_buffer: bytes,
        mime_type: str,
        document_type: DocumentType
    ) -> ValidationSignal:
        """Check if page count is within expected range."""
        page_count = await self.ocr_engine.get_page_count(file_buffer, mime_type)
        requirements = PAGE_REQUIREMENTS.get(document_type, {"min": 1, "max": 20})

        is_valid = requirements["min"] <= page_count <= requirements["max"]

        return ValidationSignal(
            signal_type=SignalType.PAGE_COUNT,
            passed=is_valid,
            score=1.0 if is_valid else 0.0,
            details=f"Page count: {page_count} (expected: {requirements['min']}-{requirements['max']})"
        )

    async def _validate_document_specific(
        self,
        document_type: DocumentType,
        extracted_data: Dict[str, Any],
        expected_data: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Run document-specific validation checks."""
        signals = []

        if document_type == DocumentType.PASSPORT_COPY:
            signals.extend(self._validate_passport(extracted_data, expected_data))
        elif document_type == DocumentType.BANK_STATEMENT:
            signals.extend(self._validate_bank_statement(extracted_data, expected_data))
        elif document_type == DocumentType.EMPLOYMENT_LETTER:
            signals.extend(self._validate_employment_letter(extracted_data, expected_data))
        elif document_type == DocumentType.VISA_APPLICATION_FORM:
            signals.extend(self._validate_visa_form(extracted_data, expected_data))
        elif document_type == DocumentType.ACCOMMODATION_PROOF:
            signals.extend(self._validate_accommodation(extracted_data, expected_data))

        return signals

    def _validate_passport(
        self,
        extracted: Dict[str, Any],
        expected: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Validate passport document."""
        signals = []

        # Check passport number format
        passport_number = extracted.get("passport_number")
        signals.append(ValidationSignal(
            signal_type=SignalType.PASSPORT_NUMBER_FORMAT,
            passed=passport_number is not None and len(passport_number) >= 6,
            score=1.0 if passport_number else 0.0,
            details=f"Passport number: {passport_number or 'not found'}"
        ))

        # Check name match if expected
        if expected and expected.get("full_name"):
            name_match = self._check_name_match(
                extracted.get("full_name"),
                expected.get("full_name")
            )
            signals.append(name_match)

        # Check expiry date
        expiry = extracted.get("expiry_date")
        if expiry:
            is_valid = self._is_date_future(expiry)
            signals.append(ValidationSignal(
                signal_type=SignalType.EXPIRY_CHECK,
                passed=is_valid,
                score=1.0 if is_valid else 0.0,
                details=f"Expiry date: {expiry} ({'valid' if is_valid else 'expired'})"
            ))

        # Check MRZ
        signals.append(ValidationSignal(
            signal_type=SignalType.MRZ_VALIDATION,
            passed=extracted.get("mrz_detected", False),
            score=1.0 if extracted.get("mrz_detected") else 0.5,
            details="MRZ detected" if extracted.get("mrz_detected") else "MRZ not detected (may be cropped)"
        ))

        return signals

    def _validate_bank_statement(
        self,
        extracted: Dict[str, Any],
        expected: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Validate bank statement."""
        signals = []

        # Check bank name
        bank_name = extracted.get("bank_name")
        signals.append(ValidationSignal(
            signal_type=SignalType.BANK_RECOGNIZED,
            passed=bank_name is not None,
            score=1.0 if bank_name else 0.0,
            details=f"Bank: {bank_name or 'not identified'}"
        ))

        # Check balance extraction
        balance = extracted.get("closing_balance")
        signals.append(ValidationSignal(
            signal_type=SignalType.BALANCE_EXTRACTION,
            passed=balance is not None,
            score=1.0 if balance else 0.0,
            details=f"Balance: {extracted.get('currency', '')} {balance or 'not found'}"
        ))

        # Check statement recency
        period = extracted.get("statement_period")
        if period and period.get("end"):
            is_recent = self._is_date_recent(period["end"], months=3)
            signals.append(ValidationSignal(
                signal_type=SignalType.STATEMENT_RECENCY,
                passed=is_recent,
                score=1.0 if is_recent else 0.0,
                details=f"Statement ends: {period['end']} ({'recent' if is_recent else 'older than 3 months'})"
            ))

        # Check name match if expected
        if expected and expected.get("full_name"):
            name_match = self._check_name_match(
                extracted.get("account_holder_name"),
                expected.get("full_name")
            )
            signals.append(name_match)

        return signals

    def _validate_employment_letter(
        self,
        extracted: Dict[str, Any],
        expected: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Validate employment letter."""
        signals = []

        # Check letterhead
        signals.append(ValidationSignal(
            signal_type=SignalType.LETTERHEAD_DETECTION,
            passed=extracted.get("letterhead_detected", False),
            score=1.0 if extracted.get("letterhead_detected") else 0.5,
            details="Letterhead detected" if extracted.get("letterhead_detected") else "No company letterhead detected"
        ))

        # Check signature
        signals.append(ValidationSignal(
            signal_type=SignalType.SIGNATURE_DETECTION,
            passed=extracted.get("signature_detected", False),
            score=1.0 if extracted.get("signature_detected") else 0.5,
            details="Signature detected" if extracted.get("signature_detected") else "No signature detected"
        ))

        # Check salary extraction
        salary = extracted.get("salary")
        signals.append(ValidationSignal(
            signal_type=SignalType.SALARY_EXTRACTION,
            passed=salary is not None,
            score=1.0 if salary else 0.5,
            details=f"Salary: {extracted.get('salary_currency', '')} {salary or 'not found'}"
        ))

        # Check letter recency
        letter_date = extracted.get("letter_date")
        if letter_date:
            is_recent = self._is_date_recent(letter_date, months=3)
            signals.append(ValidationSignal(
                signal_type=SignalType.LETTER_RECENCY,
                passed=is_recent,
                score=1.0 if is_recent else 0.0,
                details=f"Letter date: {letter_date} ({'recent' if is_recent else 'older than 3 months'})"
            ))

        # Check name match if expected
        if expected and expected.get("full_name"):
            name_match = self._check_name_match(
                extracted.get("employee_name"),
                expected.get("full_name")
            )
            signals.append(name_match)

        return signals

    def _validate_visa_form(
        self,
        extracted: Dict[str, Any],
        expected: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Validate visa application form."""
        signals = []

        # Check form completeness
        required_fields = ["applicant_name", "passport_number"]
        found_fields = sum(1 for f in required_fields if extracted.get(f))
        completeness = found_fields / len(required_fields)

        signals.append(ValidationSignal(
            signal_type=SignalType.FORM_COMPLETENESS,
            passed=completeness >= 0.5,
            score=completeness,
            details=f"Form completeness: {found_fields}/{len(required_fields)} required fields"
        ))

        # Check signature
        signals.append(ValidationSignal(
            signal_type=SignalType.SIGNATURE_DETECTION,
            passed=extracted.get("signature_present", False),
            score=1.0 if extracted.get("signature_present") else 0.0,
            details="Signature present" if extracted.get("signature_present") else "No signature detected"
        ))

        # Check name match if expected
        if expected and expected.get("full_name"):
            name_match = self._check_name_match(
                extracted.get("applicant_name"),
                expected.get("full_name")
            )
            signals.append(name_match)

        return signals

    def _validate_accommodation(
        self,
        extracted: Dict[str, Any],
        expected: Optional[Dict[str, Any]]
    ) -> List[ValidationSignal]:
        """Validate accommodation proof."""
        signals = []

        # Check booking confirmed
        signals.append(ValidationSignal(
            signal_type=SignalType.BOOKING_CONFIRMED,
            passed=extracted.get("booking_confirmed", False),
            score=1.0 if extracted.get("booking_confirmed") else 0.0,
            details="Booking confirmed" if extracted.get("booking_confirmed") else "Booking status unclear"
        ))

        # Check address extraction
        address = extracted.get("accommodation_address")
        signals.append(ValidationSignal(
            signal_type=SignalType.ADDRESS_EXTRACTION,
            passed=address is not None,
            score=1.0 if address else 0.0,
            details=f"Address: {address[:50] + '...' if address and len(address) > 50 else address or 'not found'}"
        ))

        # Check dates cover trip
        check_in = extracted.get("check_in_date")
        check_out = extracted.get("check_out_date")
        dates_valid = check_in is not None and check_out is not None

        signals.append(ValidationSignal(
            signal_type=SignalType.DATES_COVER_TRIP,
            passed=dates_valid,
            score=1.0 if dates_valid else 0.0,
            details=f"Dates: {check_in or '?'} to {check_out or '?'}"
        ))

        # Check name match if expected
        if expected and expected.get("full_name"):
            name_match = self._check_name_match(
                extracted.get("guest_name"),
                expected.get("full_name")
            )
            signals.append(name_match)

        return signals

    def _check_name_match(
        self,
        extracted_name: Optional[str],
        expected_name: str
    ) -> ValidationSignal:
        """Check if names match using fuzzy matching."""
        if not extracted_name:
            return ValidationSignal(
                signal_type=SignalType.NAME_MATCH,
                passed=False,
                score=0.0,
                details="Name not extracted from document"
            )

        # Normalize names
        extracted_norm = extracted_name.upper().strip()
        expected_norm = expected_name.upper().strip()

        # Exact match
        if extracted_norm == expected_norm:
            return ValidationSignal(
                signal_type=SignalType.NAME_MATCH,
                passed=True,
                score=1.0,
                details=f"Name matches: {extracted_name}"
            )

        # Fuzzy match
        from difflib import SequenceMatcher
        ratio = SequenceMatcher(None, extracted_norm, expected_norm).ratio()

        return ValidationSignal(
            signal_type=SignalType.NAME_MATCH,
            passed=ratio >= 0.85,
            score=ratio,
            details=f"Name match: {ratio * 100:.0f}% (extracted: {extracted_name}, expected: {expected_name})"
        )

    def _is_date_future(self, date_str: str) -> bool:
        """Check if date is in the future."""
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, "%Y-%m-%d")
            return date > datetime.now()
        except (ValueError, TypeError):
            return False

    def _is_date_recent(self, date_str: str, months: int = 3) -> bool:
        """Check if date is within the last N months."""
        try:
            from datetime import datetime
            from dateutil.relativedelta import relativedelta
            date = datetime.strptime(date_str, "%Y-%m-%d")
            cutoff = datetime.now() - relativedelta(months=months)
            return date >= cutoff
        except (ValueError, TypeError):
            return False

    def _calculate_overall_confidence(self, signals: List[ValidationSignal]) -> float:
        """Calculate overall confidence from all signals."""
        if not signals:
            return 0.0
        return sum(s.score for s in signals) / len(signals)

    def _determine_status(
        self,
        signals: List[ValidationSignal],
        confidence: float
    ) -> ValidationResult:
        """Determine overall validation status."""
        # Critical signals that must pass
        critical_types = {
            SignalType.OCR_CONFIDENCE,
            SignalType.FORMAT_VALIDATION,
            SignalType.NAME_MATCH
        }

        critical_failures = [
            s for s in signals
            if s.signal_type in critical_types and not s.passed
        ]

        if critical_failures:
            return ValidationResult.INVALID

        if confidence >= 0.85:
            return ValidationResult.VALID

        return ValidationResult.NEEDS_REVIEW

    def _elapsed_ms(self, start_time: datetime) -> int:
        """Calculate elapsed time in milliseconds."""
        return int((datetime.now() - start_time).total_seconds() * 1000)
