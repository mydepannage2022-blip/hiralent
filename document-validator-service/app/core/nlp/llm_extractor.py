"""
LLM-based entity extraction using OpenAI or Google Gemini for robust multi-language document parsing.
"""

import json
import logging
from typing import Dict, Any, Optional
from enum import Enum

from app.models.enums import DocumentType
from app.config import settings

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    """Available AI providers."""
    OPENAI = "openai"
    GEMINI = "gemini"
    NONE = "none"


# Global AI client instances
_openai_client: Optional[Any] = None
_gemini_client: Optional[Any] = None
_provider: AIProvider = AIProvider.NONE


def initialize_ai_client() -> AIProvider:
    """Initialize AI client based on available API keys."""
    global _openai_client, _gemini_client, _provider

    # Try Gemini first (if configured)
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_client = genai
            _provider = AIProvider.GEMINI
            logger.info(f"Initialized Gemini AI client with model: {settings.GEMINI_MODEL}")
            return AIProvider.GEMINI
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini client: {e}")

    # Try OpenAI as fallback
    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            _provider = AIProvider.OPENAI
            logger.info(f"Initialized OpenAI client with model: {settings.OPENAI_MODEL}")
            return AIProvider.OPENAI
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client: {e}")

    logger.warning("No AI provider configured (GEMINI_API_KEY or OPENAI_API_KEY required)")
    _provider = AIProvider.NONE
    return AIProvider.NONE


class LLMEntityExtractor:
    """Extract entities from document text using LLM (Gemini or OpenAI GPT)."""

    def __init__(self):
        self.provider = initialize_ai_client()
        if self.provider == AIProvider.NONE:
            raise RuntimeError("No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env")

    async def extract(
        self,
        text: str,
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """
        Extract entities based on document type using LLM.

        Args:
            text: OCR text from document
            document_type: Type of document

        Returns:
            Dictionary of extracted entities
        """
        try:
            # Route to document-specific extraction
            if document_type == DocumentType.PASSPORT_COPY:
                return await self._extract_passport_data(text)
            elif document_type == DocumentType.BANK_STATEMENT:
                return await self._extract_bank_statement_data(text)
            elif document_type == DocumentType.EMPLOYMENT_LETTER:
                return await self._extract_employment_data(text)
            elif document_type == DocumentType.VISA_APPLICATION_FORM:
                return await self._extract_visa_form_data(text)
            elif document_type == DocumentType.ACCOMMODATION_PROOF:
                return await self._extract_accommodation_data(text)

            return {"document_type": document_type.value, "raw_text": text}

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return {"document_type": document_type.value, "raw_text": text, "error": str(e)}

    async def _extract_passport_data(self, text: str) -> Dict[str, Any]:
        """Extract passport-specific fields using LLM."""
        system_prompt = """You are a passport data extraction expert. Extract information from passport OCR text.
The text may be in English, French, Arabic, or mixed languages. Handle OCR errors gracefully.

Return ONLY valid JSON with these fields (use null if field not found):
{
  "document_type": "passport_copy",
  "full_name": "FULL NAME IN CAPS",
  "passport_number": "AB1234567",
  "date_of_birth": "YYYY-MM-DD",
  "expiry_date": "YYYY-MM-DD",
  "issue_date": "YYYY-MM-DD",
  "nationality": "Country name",
  "gender": "M or F",
  "place_of_birth": "City, Country",
  "issuing_country": "Country name",
  "mrz_detected": true/false,
  "mrz_data": {
    "passport_number_mrz": "AB1234567",
    "surname_mrz": "SURNAME",
    "given_names_mrz": "GIVEN NAMES",
    "nationality_mrz": "USA",
    "dob_mrz": "YYYY-MM-DD",
    "expiry_mrz": "YYYY-MM-DD"
  }
}

Important:
- Extract MRZ if you see lines with <<< symbols and characters like P<USA<DOE<<JOHN
- MRZ lines typically have 44 characters with < symbols as separators
- Dates should be in YYYY-MM-DD format
- Return null for missing fields, not empty strings
- Names should be in UPPERCASE
- Look for French labels like "Passeport N°", "Date de naissance", "Date d'expiration"
- Look for Arabic text and extract Latin transliterations
- Gender: look for "Sexe", "Sex", M/F labels
- Place of birth: look for "Lieu de naissance", "Place of birth"
- Issuing country: look for "Autorité", "Authority", or derive from passport code (MAR=Morocco, FRA=France)"""

        user_prompt = f"Extract passport data from this OCR text:\n\n{text[:3000]}"

        return await self._call_ai(system_prompt, user_prompt)

    async def _extract_bank_statement_data(self, text: str) -> Dict[str, Any]:
        """Extract bank statement fields using LLM."""
        system_prompt = """You are a bank statement data extraction expert. Extract information from bank statement OCR text.
The text may be in multiple languages. Handle OCR errors and various formats.

Return ONLY valid JSON with these fields (use null if not found):
{
  "document_type": "bank_statement",
  "account_holder_name": "Name",
  "bank_name": "Bank Name",
  "account_number": "1234567890",
  "currency": "USD",
  "closing_balance": 12345.67,
  "statement_period": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  }
}

Important:
- Extract the final/closing balance, not opening balance
- Currency as 3-letter code (USD, EUR, MAD, etc.)
- Balance as number, not string
- Account number can be regular account or IBAN format
- Look for labels in multiple languages (Balance, Solde, etc.)"""

        user_prompt = f"Extract bank statement data from this OCR text:\n\n{text[:3000]}"

        return await self._call_ai(system_prompt, user_prompt)

    async def _extract_employment_data(self, text: str) -> Dict[str, Any]:
        """Extract employment letter fields using LLM."""
        system_prompt = """You are an employment letter data extraction expert. Extract information from employment letter OCR text.
The text may be in multiple languages (English, French, etc.).

Return ONLY valid JSON with these fields (use null if not found):
{
  "document_type": "employment_letter",
  "employee_name": "Name",
  "employer_name": "Company Name",
  "job_title": "Position/Title",
  "salary": 50000.00,
  "salary_currency": "USD",
  "employment_dates": ["2020-01-01", "present"],
  "letter_date": "YYYY-MM-DD",
  "letterhead_detected": true/false,
  "signature_detected": true/false
}

Important:
- Salary as number, not string
- Set letterhead_detected to true if you see company logo, official header
- Set signature_detected to true if text mentions signature or signed
- employment_dates can be dates or strings like "present", "ongoing"
- Look for French labels like "Salaire", "Poste", "Date d'embauche"
"""

        user_prompt = f"Extract employment letter data from this OCR text:\n\n{text[:3000]}"

        return await self._call_ai(system_prompt, user_prompt)

    async def _extract_visa_form_data(self, text: str) -> Dict[str, Any]:
        """Extract visa application form fields using LLM."""
        system_prompt = """You are a visa application form data extraction expert. Extract information from visa form OCR text.

Return ONLY valid JSON with these fields (use null if not found):
{
  "document_type": "visa_application_form",
  "applicant_name": "Name",
  "passport_number": "AB1234567",
  "visa_type": "Tourist/Business/Student/etc",
  "purpose_of_travel": "Purpose",
  "travel_dates": ["start_date", "end_date"],
  "signature_present": true/false
}

Important:
- visa_type: extract the type mentioned (tourist, business, student, work, etc.)
- purpose_of_travel: brief reason for travel
- signature_present: true if form mentions signature or signed"""

        user_prompt = f"Extract visa application form data from this OCR text:\n\n{text[:3000]}"

        return await self._call_ai(system_prompt, user_prompt)

    async def _extract_accommodation_data(self, text: str) -> Dict[str, Any]:
        """Extract accommodation proof fields using LLM."""
        system_prompt = """You are an accommodation booking data extraction expert. Extract information from hotel/Airbnb booking OCR text.

Return ONLY valid JSON with these fields (use null if not found):
{
  "document_type": "accommodation_proof",
  "guest_name": "Name",
  "provider_name": "Hotel/Airbnb name",
  "booking_reference": "ABC123",
  "accommodation_address": "Full address",
  "check_in_date": "YYYY-MM-DD",
  "check_out_date": "YYYY-MM-DD",
  "booking_confirmed": true/false
}

Important:
- booking_confirmed: true if you see words like "confirmed", "paid", "booked"
- Extract full address including city, country
- booking_reference: confirmation/reservation number"""

        user_prompt = f"Extract accommodation booking data from this OCR text:\n\n{text[:3000]}"

        return await self._call_ai(system_prompt, user_prompt)

    async def _call_ai(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Call AI provider (Gemini or OpenAI) with retry logic and JSON parsing.

        Args:
            system_prompt: System instructions for extraction
            user_prompt: User prompt with OCR text

        Returns:
            Extracted data as dictionary
        """
        try:
            if self.provider == AIProvider.GEMINI:
                return await self._call_gemini(system_prompt, user_prompt)
            elif self.provider == AIProvider.OPENAI:
                return await self._call_openai(system_prompt, user_prompt)
            else:
                return {"error": "No AI provider available"}

        except Exception as e:
            logger.error(f"AI API call failed: {e}")
            return {"error": str(e)}

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call Google Gemini API."""
        try:
            import google.generativeai as genai

            # Disable safety filters for document processing (passport PII triggers them)
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            model = _gemini_client.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={
                    "temperature": 0.1,
                    "top_p": 0.95,
                    "top_k": 1,
                    "max_output_tokens": 2048,
                },
                safety_settings=safety_settings
            )

            full_prompt = f"{system_prompt}\n\n{user_prompt}\n\nReturn ONLY valid JSON, no markdown, no explanations."

            response = model.generate_content(full_prompt)

            # Log finish reason for debugging
            if response.candidates:
                finish_reason = response.candidates[0].finish_reason
                logger.info(f"Gemini finish_reason: {finish_reason}")

            content = response.text.strip()

            logger.info(f"Gemini response length: {len(content)} chars")
            logger.debug(f"Gemini response: {content[:300]}...")

            # Clean markdown formatting if present (fallback for older models)
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "").strip()

            # Extract JSON from response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                content = content[start:end]

            # Parse JSON
            data = json.loads(content)
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}")
            logger.error(f"Response content: {content}")
            return {"error": "Invalid JSON from Gemini"}

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            return {"error": str(e)}

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call OpenAI API."""
        try:
            response = _openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=1500,
                response_format={"type": "json_object"}  # Force JSON output
            )

            content = response.choices[0].message.content
            logger.debug(f"OpenAI response: {content[:200]}...")

            # Parse JSON response
            data = json.loads(content)
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI JSON response: {e}")
            logger.error(f"Response content: {content}")
            return {"error": "Invalid JSON from OpenAI"}

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return {"error": str(e)}
