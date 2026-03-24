from enum import Enum


class DocumentType(str, Enum):
    PASSPORT_COPY = "passport_copy"
    VISA_APPLICATION_FORM = "visa_application_form"
    BANK_STATEMENT = "bank_statement"
    EMPLOYMENT_LETTER = "employment_letter"
    ACCOMMODATION_PROOF = "accommodation_proof"


class ValidationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ValidationResult(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    NEEDS_REVIEW = "needs_review"


class SignalType(str, Enum):
    # OCR
    OCR_CONFIDENCE = "ocr_confidence"

    # Format
    FORMAT_VALIDATION = "format_validation"
    FILE_SIZE = "file_size"
    PAGE_COUNT = "page_count"

    # Content
    NAME_MATCH = "name_match"
    DATE_VALID = "date_valid"
    EXPIRY_CHECK = "expiry_check"

    # Passport specific
    PASSPORT_NUMBER_FORMAT = "passport_number_format"
    PAGE_COMPLETENESS = "page_completeness"
    MRZ_VALIDATION = "mrz_validation"

    # Visa form
    FORM_COMPLETENESS = "form_completeness"
    SIGNATURE_DETECTION = "signature_detection"
    DATE_CONSISTENCY = "date_consistency"

    # Bank statement
    BANK_RECOGNIZED = "bank_recognized"
    STATEMENT_RECENCY = "statement_recency"
    BALANCE_EXTRACTION = "balance_extraction"

    # Employment letter
    LETTERHEAD_DETECTION = "letterhead_detection"
    SALARY_EXTRACTION = "salary_extraction"
    LETTER_RECENCY = "letter_recency"

    # Accommodation
    DATES_COVER_TRIP = "dates_cover_trip"
    ADDRESS_EXTRACTION = "address_extraction"
    BOOKING_CONFIRMED = "booking_confirmed"
