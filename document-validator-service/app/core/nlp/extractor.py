"""
SpaCy-based entity extraction for documents.
"""

import spacy
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from dateutil import parser as date_parser
import logging

from app.models.enums import DocumentType
from app.core.nlp import patterns

logger = logging.getLogger(__name__)

# Global SpaCy model instance
_nlp_model = None


def load_spacy_model():
    """Load and configure SpaCy model."""
    global _nlp_model
    if _nlp_model is None:
        try:
            _nlp_model = spacy.load("en_core_web_md")
            logger.info("Loaded SpaCy model: en_core_web_md")
        except OSError:
            logger.warning("SpaCy model not found, trying alternative...")
            try:
                _nlp_model = spacy.load("en_core_web_sm")
                logger.info("Loaded SpaCy model: en_core_web_sm")
            except OSError:
                raise RuntimeError("No SpaCy model found. Please install en_core_web_md or en_core_web_sm")

        # Add entity ruler for custom patterns
        if "entity_ruler" not in _nlp_model.pipe_names:
            ruler = _nlp_model.add_pipe("entity_ruler", before="ner")
            ruler.add_patterns(patterns.SPACY_PATTERNS)

    return _nlp_model


class EntityExtractor:
    """Extract entities from document text using SpaCy and regex patterns."""

    def __init__(self):
        self.nlp = load_spacy_model()

    async def extract(
        self,
        text: str,
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """
        Extract entities based on document type.

        Args:
            text: OCR text from document
            document_type: Type of document

        Returns:
            Dictionary of extracted entities
        """
        # Run SpaCy NER
        doc = self.nlp(text)

        # Base extraction
        base_entities = {
            "persons": [ent.text for ent in doc.ents if ent.label_ == "PERSON"],
            "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"],
            "organizations": [ent.text for ent in doc.ents if ent.label_ == "ORG"],
            "money": [ent.text for ent in doc.ents if ent.label_ == "MONEY"],
            "locations": [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC"]],
            "raw_text": text
        }

        # Document-specific extraction
        if document_type == DocumentType.PASSPORT_COPY:
            return self._extract_passport_data(text, base_entities)
        elif document_type == DocumentType.BANK_STATEMENT:
            return self._extract_bank_statement_data(text, base_entities)
        elif document_type == DocumentType.EMPLOYMENT_LETTER:
            return self._extract_employment_data(text, base_entities)
        elif document_type == DocumentType.VISA_APPLICATION_FORM:
            return self._extract_visa_form_data(text, base_entities)
        elif document_type == DocumentType.ACCOMMODATION_PROOF:
            return self._extract_accommodation_data(text, base_entities)

        return base_entities

    def _extract_passport_data(self, text: str, base_entities: Dict) -> Dict[str, Any]:
        """Extract passport-specific fields."""
        data = {"document_type": "passport_copy"}

        # Full name
        if base_entities["persons"]:
            data["full_name"] = base_entities["persons"][0].upper()

        # Passport number
        for country, pattern in patterns.PASSPORT_PATTERNS.items():
            match = pattern.search(text)
            if match:
                data["passport_number"] = match.group(1).upper()
                data["passport_country_hint"] = country
                break

        # Date of birth
        for pattern in patterns.DOB_PATTERNS:
            match = pattern.search(text)
            if match:
                data["date_of_birth"] = self._parse_date(match.group(1))
                break

        # Expiry date
        for pattern in patterns.EXPIRY_PATTERNS:
            match = pattern.search(text)
            if match:
                data["expiry_date"] = self._parse_date(match.group(1))
                break

        # Issue date
        for pattern in patterns.ISSUE_DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                data["issue_date"] = self._parse_date(match.group(1))
                break

        # Nationality
        if base_entities["locations"]:
            data["nationality"] = base_entities["locations"][0]

        # MRZ detection (Machine Readable Zone)
        mrz_lines = self._detect_mrz(text)
        if mrz_lines:
            data["mrz_detected"] = True
            data["mrz_data"] = self._parse_mrz(mrz_lines)
        else:
            data["mrz_detected"] = False

        return data

    def _extract_bank_statement_data(self, text: str, base_entities: Dict) -> Dict[str, Any]:
        """Extract bank statement fields."""
        data = {"document_type": "bank_statement"}

        # Account holder
        if base_entities["persons"]:
            data["account_holder_name"] = base_entities["persons"][0]

        # Bank name
        if base_entities["organizations"]:
            banks = [
                org for org in base_entities["organizations"]
                if any(kw in org.lower() for kw in ["bank", "credit", "financial", "hsbc", "citi", "barclays"])
            ]
            if banks:
                data["bank_name"] = banks[0]
            else:
                data["bank_name"] = base_entities["organizations"][0]

        # Balance
        for pattern in patterns.MONEY_PATTERNS:
            match = pattern.search(text)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    data["currency"] = groups[0] or "USD"
                    try:
                        data["closing_balance"] = float(groups[1].replace(",", ""))
                    except ValueError:
                        pass
                break

        # Account number
        for pattern in patterns.ACCOUNT_PATTERNS:
            match = pattern.search(text)
            if match:
                data["account_number"] = match.group(1)
                break

        # Statement period
        for pattern in patterns.PERIOD_PATTERNS:
            match = pattern.search(text)
            if match:
                data["statement_period"] = {
                    "start": self._parse_date(match.group(1)),
                    "end": self._parse_date(match.group(2))
                }
                break

        return data

    def _extract_employment_data(self, text: str, base_entities: Dict) -> Dict[str, Any]:
        """Extract employment letter fields."""
        data = {"document_type": "employment_letter"}

        # Employee name
        if base_entities["persons"]:
            data["employee_name"] = base_entities["persons"][0]

        # Employer/Company name
        if base_entities["organizations"]:
            data["employer_name"] = base_entities["organizations"][0]

        # Job title - look for common patterns
        title_patterns = [
            re.compile(r"(?:position|title|role|employed\s*as)[:\s]+([A-Za-z\s]+?)(?:\.|,|\n|$)", re.IGNORECASE),
            re.compile(r"(?:is|are|was)\s+(?:a|an|the)\s+([A-Za-z\s]+?)(?:\s+at|\s+in|\s+for|\.|\n)", re.IGNORECASE),
        ]
        for pattern in title_patterns:
            match = pattern.search(text)
            if match:
                data["job_title"] = match.group(1).strip()
                break

        # Salary
        for pattern in patterns.SALARY_PATTERNS:
            match = pattern.search(text)
            if match:
                groups = match.groups()
                if len(groups) >= 2 and groups[1]:
                    data["salary_currency"] = groups[0] or "USD"
                    try:
                        data["salary"] = float(groups[1].replace(",", ""))
                    except ValueError:
                        pass
                break

        # Employment dates
        if base_entities["dates"]:
            data["employment_dates"] = base_entities["dates"][:2]

        # Letterhead detection
        data["letterhead_detected"] = any(
            kw in text.lower() for kw in patterns.LETTERHEAD_KEYWORDS
        )

        # Signature detection
        data["signature_detected"] = any(
            kw in text.lower() for kw in patterns.SIGNATURE_KEYWORDS
        )

        # Letter date
        letter_date_pattern = re.compile(r"(?:Date|Dated)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE)
        match = letter_date_pattern.search(text)
        if match:
            data["letter_date"] = self._parse_date(match.group(1))

        return data

    def _extract_visa_form_data(self, text: str, base_entities: Dict) -> Dict[str, Any]:
        """Extract visa application form fields."""
        data = {"document_type": "visa_application_form"}

        # Applicant name
        if base_entities["persons"]:
            data["applicant_name"] = base_entities["persons"][0]

        # Passport number
        for pattern in patterns.PASSPORT_PATTERNS.values():
            match = pattern.search(text)
            if match:
                data["passport_number"] = match.group(1).upper()
                break

        # Visa type
        visa_type_pattern = re.compile(r"(?:visa\s*type|type\s*of\s*visa)[:\s]*([A-Za-z\s]+?)(?:\.|,|\n|$)", re.IGNORECASE)
        match = visa_type_pattern.search(text)
        if match:
            data["visa_type"] = match.group(1).strip()

        # Purpose of travel
        purpose_pattern = re.compile(r"(?:purpose|reason)[:\s]*([A-Za-z\s]+?)(?:\.|,|\n|$)", re.IGNORECASE)
        match = purpose_pattern.search(text)
        if match:
            data["purpose_of_travel"] = match.group(1).strip()

        # Travel dates
        if base_entities["dates"]:
            data["travel_dates"] = base_entities["dates"]

        # Signature detection
        data["signature_present"] = any(
            kw in text.lower() for kw in patterns.SIGNATURE_KEYWORDS
        )

        return data

    def _extract_accommodation_data(self, text: str, base_entities: Dict) -> Dict[str, Any]:
        """Extract accommodation proof fields."""
        data = {"document_type": "accommodation_proof"}

        # Guest name
        guest_patterns = [
            re.compile(r"(?:Guest|Name)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)", re.IGNORECASE),
        ]
        for pattern in guest_patterns:
            match = pattern.search(text)
            if match:
                data["guest_name"] = match.group(1)
                break

        if "guest_name" not in data and base_entities["persons"]:
            data["guest_name"] = base_entities["persons"][0]

        # Provider name (hotel, Airbnb, etc.)
        if base_entities["organizations"]:
            data["provider_name"] = base_entities["organizations"][0]

        # Booking reference
        for pattern in patterns.BOOKING_REF_PATTERNS:
            match = pattern.search(text)
            if match:
                data["booking_reference"] = match.group(1)
                break

        # Address
        for pattern in patterns.ADDRESS_PATTERNS:
            match = pattern.search(text)
            if match:
                data["accommodation_address"] = match.group(1).strip() if match.lastindex else match.group(0).strip()
                break

        # Check-in/Check-out dates
        checkin_pattern = re.compile(r"(?:Check[\s-]?in|Arrival)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE)
        checkout_pattern = re.compile(r"(?:Check[\s-]?out|Departure)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE)

        match = checkin_pattern.search(text)
        if match:
            data["check_in_date"] = self._parse_date(match.group(1))

        match = checkout_pattern.search(text)
        if match:
            data["check_out_date"] = self._parse_date(match.group(1))

        # Booking status
        confirmed_keywords = ["confirmed", "paid", "booked", "reservation confirmed"]
        data["booking_confirmed"] = any(kw in text.lower() for kw in confirmed_keywords)

        return data

    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format."""
        if not date_str:
            return None

        try:
            dt = date_parser.parse(date_str, dayfirst=True)
            return dt.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            pass

        # Manual format parsing
        formats = [
            "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d",
            "%d-%m-%Y", "%d.%m.%Y", "%d %B %Y",
            "%d %b %Y", "%Y/%m/%d"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        return date_str

    def _detect_mrz(self, text: str) -> List[str]:
        """Detect Machine Readable Zone lines in passport."""
        # MRZ lines are typically 44 characters for passport
        lines = text.split("\n")
        mrz_lines = []

        for line in lines:
            # Clean line
            clean_line = re.sub(r"[^A-Z0-9<]", "", line.upper())
            # MRZ lines have specific patterns
            if len(clean_line) >= 40 and clean_line.count("<") >= 2:
                mrz_lines.append(clean_line)

        return mrz_lines if len(mrz_lines) >= 2 else []

    def _parse_mrz(self, mrz_lines: List[str]) -> Dict[str, str]:
        """Parse MRZ data (simplified)."""
        data = {}

        if len(mrz_lines) >= 2:
            # Line 1: Document type, country, name
            line1 = mrz_lines[0]
            data["document_type_mrz"] = line1[0:2].replace("<", "")
            data["country_code"] = line1[2:5].replace("<", "")

            # Extract name (everything after position 5 until <<)
            name_part = line1[5:]
            if "<<" in name_part:
                surname, given = name_part.split("<<", 1)
                data["surname_mrz"] = surname.replace("<", " ").strip()
                data["given_names_mrz"] = given.replace("<", " ").strip()

            # Line 2: Passport number, nationality, DOB, sex, expiry
            line2 = mrz_lines[1]
            data["passport_number_mrz"] = line2[0:9].replace("<", "")
            data["nationality_mrz"] = line2[10:13].replace("<", "")

            # DOB: YYMMDD at position 13-19
            dob = line2[13:19]
            if dob.isdigit():
                year = int(dob[0:2])
                year = 1900 + year if year > 50 else 2000 + year
                data["dob_mrz"] = f"{year}-{dob[2:4]}-{dob[4:6]}"

            # Expiry: YYMMDD at position 21-27
            exp = line2[21:27]
            if exp.isdigit():
                year = int(exp[0:2])
                year = 2000 + year  # Expiry is always future
                data["expiry_mrz"] = f"{year}-{exp[2:4]}-{exp[4:6]}"

        return data
