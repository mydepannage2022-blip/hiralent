"""
Regex patterns for document field extraction.
"""

import re
from typing import Dict, List, Pattern

# Passport number patterns by country
PASSPORT_PATTERNS: Dict[str, Pattern] = {
    "US": re.compile(r"\b([A-Z]{1,2}\d{6,8})\b"),
    "UK": re.compile(r"\b(\d{9})\b"),
    "FR": re.compile(r"\b(\d{2}[A-Z]{2}\d{5})\b"),
    "DE": re.compile(r"\b([CFGHJKLMNPRTVWXYZ0-9]{9})\b"),
    "MA": re.compile(r"\b([A-Z]{2}\d{6,7})\b"),  # Morocco
    "DEFAULT": re.compile(r"\b([A-Z0-9]{6,12})\b"),
}

# Date patterns (multiple formats)
DATE_PATTERNS: List[Pattern] = [
    re.compile(r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b"),
    re.compile(r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b", re.IGNORECASE),
    re.compile(r"\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b"),  # ISO format
]

# Labeled date patterns
DOB_PATTERNS: List[Pattern] = [
    re.compile(r"(?:DOB|Date\s*of\s*Birth|Born|Né\(?e?\)?)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE),
    re.compile(r"(?:DOB|Date\s*of\s*Birth|Born)[:\s]*(\d{1,2}\s+\w{3,9}\s+\d{4})", re.IGNORECASE),
]

EXPIRY_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Expiry|Exp(?:iration)?|Valid\s*Until|Expires?)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE),
    re.compile(r"(?:Expiry|Exp|Valid\s*Until)[:\s]*(\d{1,2}\s+\w{3,9}\s+\d{4})", re.IGNORECASE),
]

ISSUE_DATE_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Issue(?:d)?|Date\s*of\s*Issue)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", re.IGNORECASE),
    re.compile(r"(?:Issue(?:d)?|Date\s*of\s*Issue)[:\s]*(\d{1,2}\s+\w{3,9}\s+\d{4})", re.IGNORECASE),
]

# Money/balance patterns
MONEY_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Balance|Solde|Available)[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)", re.IGNORECASE),
    re.compile(r"([A-Z]{3})\s*([\d,]+\.?\d{2})\b"),  # Currency code + amount
    re.compile(r"([$€£¥])\s*([\d,]+\.?\d{2})\b"),  # Symbol + amount
    re.compile(r"([\d,]+\.?\d{2})\s*(USD|EUR|GBP|MAD|CAD|AUD)", re.IGNORECASE),  # Amount + code
]

# Account number patterns
ACCOUNT_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Account|Acct|A/C)[:\s#]*(\d{8,20})", re.IGNORECASE),
    re.compile(r"(?:IBAN)[:\s]*([A-Z]{2}\d{2}[A-Z0-9]{4,30})", re.IGNORECASE),
]

# Statement period patterns
PERIOD_PATTERNS: List[Pattern] = [
    re.compile(
        r"(?:Period|Statement\s*Period)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-|–)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
        re.IGNORECASE
    ),
]

# Address patterns
ADDRESS_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Address|Adresse)[:\s]*(.+?)(?=\n|$)", re.IGNORECASE),
    re.compile(r"\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)[,\s]+[\w\s]+", re.IGNORECASE),
]

# Booking reference patterns
BOOKING_REF_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Booking|Confirmation|Reference|Ref)[:\s#]*([A-Z0-9]{6,12})", re.IGNORECASE),
    re.compile(r"(?:Reservation)[:\s#]*([A-Z0-9]{6,12})", re.IGNORECASE),
]

# Salary patterns
SALARY_PATTERNS: List[Pattern] = [
    re.compile(r"(?:Salary|Annual\s*Salary|Monthly\s*Salary|Compensation)[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)", re.IGNORECASE),
    re.compile(r"(?:per\s*(?:year|annum|month))[:\s]*([\d,]+\.?\d*)", re.IGNORECASE),
]

# Signature detection keywords
SIGNATURE_KEYWORDS: List[str] = [
    "signature", "signed", "signé", "authorized", "authorised",
    "représentant", "representative"
]

# Letterhead detection keywords
LETTERHEAD_KEYWORDS: List[str] = [
    "ltd", "limited", "inc", "incorporated", "corp", "corporation",
    "llc", "sarl", "sa", "gmbh", "plc", "company"
]

# SpaCy entity ruler patterns for custom entities
SPACY_PATTERNS: List[Dict] = [
    {"label": "PASSPORT_NO", "pattern": [{"TEXT": {"REGEX": r"^[A-Z]{1,2}\d{6,8}$"}}]},
    {"label": "IBAN", "pattern": [{"TEXT": {"REGEX": r"^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$"}}]},
    {"label": "BOOKING_REF", "pattern": [{"TEXT": {"REGEX": r"^[A-Z0-9]{6,12}$"}}]},
]
