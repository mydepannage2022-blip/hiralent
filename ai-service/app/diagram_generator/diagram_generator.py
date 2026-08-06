# app/diagram_generator/diagram_generator.py
"""
Generate COMPLETE Mermaid code for diagrams.

Enhancement:
- After ER generation, automatically append explicit UML-style multiplicities
  to relationship labels based on crowfoot symbols (||, o|, |{, o{).
"""

import os
import re
import logging
from typing import Dict, Optional

import google.generativeai as genai

from app.core.prompt_guard import build_safety_settings

logger = logging.getLogger(__name__)


class DiagramGenerator:
    """Generates COMPLETE Mermaid code for different diagram types."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

        genai.configure(api_key=api_key)
        # Safe safety thresholds (R-34) at construction. Input is second-order (a
        # model-generated question title), so no untrusted-text fencing is needed here.
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash-exp", safety_settings=build_safety_settings()
        )

    async def generate_diagram_code(
        self,
        question_data: Dict,
        diagram_type: str,
        max_retries: int = 2
    ) -> Optional[str]:
        """
        Generate Mermaid code for a diagram type.
        """
        prompt = self._build_prompt(question_data, diagram_type)

        for attempt in range(max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_retries}: generating diagram")

                response = self.model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": 0.4,
                        "top_p": 0.95,
                        "top_k": 40,
                        "candidate_count": 1,
                    }
                )

                mermaid_code = self._extract_mermaid_code(response.text)

                if not mermaid_code:
                    logger.warning(f"Attempt {attempt + 1}: no Mermaid code extracted")
                    continue

                if diagram_type == "er":
                    mermaid_code = self._clean_mermaid_er_syntax(mermaid_code)

                    entity_count = len(re.findall(r'^\s*\w+\s*\{', mermaid_code, re.MULTILINE))
                    logger.info(f"Generated {entity_count} entities")

                    if entity_count < 5:
                        logger.warning(f"Only {entity_count} entities; using enhanced template fallback")
                        mermaid_code = self._get_enhanced_fallback_template(question_data)

                    # Ensure all entities have attributes
                    if not self._validate_er_completeness(mermaid_code):
                        logger.warning("Some entities incomplete; fixing...")
                        mermaid_code = self._fix_incomplete_entities(mermaid_code)

                    # ✅ NEW: append explicit multiplicities to relationship labels
                    mermaid_code = self._append_multiplicity_to_relationship_labels(mermaid_code)

                if not self._validate_mermaid(mermaid_code, diagram_type):
                    logger.error(f"Attempt {attempt + 1}: invalid Mermaid syntax")
                    continue

                logger.info(f"Success on attempt {attempt + 1}")
                return mermaid_code

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} error: {e}", exc_info=True)
                if attempt == max_retries - 1:
                    if diagram_type == "er":
                        logger.info("Using fallback template as last resort")
                        mermaid_code = self._get_enhanced_fallback_template(question_data)
                        mermaid_code = self._append_multiplicity_to_relationship_labels(mermaid_code)
                        return mermaid_code
                    return None

        if diagram_type == "er":
            mermaid_code = self._get_enhanced_fallback_template(question_data)
            mermaid_code = self._append_multiplicity_to_relationship_labels(mermaid_code)
            return mermaid_code

        return None

    def _build_prompt(self, question_data: Dict, diagram_type: str) -> str:
        title = question_data.get("title", "")

        base_instructions = """
You are an expert at creating technical diagrams using Mermaid syntax.

RULES:
1. Return ONLY Mermaid code
2. No markdown code blocks
3. Start with diagram type keyword
4. Complete all entities
"""

        if diagram_type == "er":
            return f"""{base_instructions}

CREATE COMPLETE ER DIAGRAM for: {title}

MUST INCLUDE ALL 6+ TABLES:
1. CATEGORY - product categories
2. PRODUCT - items for sale
3. CUSTOMER - user accounts
4. ORDER - purchase orders
5. ORDER_ITEM - order line items
6. PAYMENT - transactions
(OPTIONAL) CUSTOMER_ADDRESS if addresses are mentioned.

FORMAT (COPY THIS STRUCTURE):
erDiagram
    CATEGORY ||--o{{ PRODUCT : contains
    CUSTOMER ||--o{{ ORDER : places
    CUSTOMER ||--o{{ CUSTOMER_ADDRESS : has
    ORDER ||--|{{ ORDER_ITEM : contains
    PRODUCT ||--o{{ ORDER_ITEM : includes
    ORDER ||--|| PAYMENT : has

    CATEGORY {{
        int category_id PK
        string name
        text description
        datetime created_at
    }}

    PRODUCT {{
        int product_id PK
        int category_id FK
        string name
        decimal price
        int stock
        datetime created_at
    }}

    CUSTOMER {{
        int customer_id PK
        string first_name
        string last_name
        string email
        string phone
        datetime created_at
    }}

    ORDER {{
        int order_id PK
        int customer_id FK
        date order_date
        decimal total
        string status
        datetime created_at
    }}

    ORDER_ITEM {{
        int item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal price
    }}

    PAYMENT {{
        int payment_id PK
        int order_id FK
        decimal amount
        string method
        datetime date
        string status
    }}

Generate ALL tables with 4-8 attributes each.
Return ONLY Mermaid code.
"""
        return base_instructions

    # ---------------------------
    # ✅ NEW: Multiplicity helper
    # ---------------------------

    def _crowfoot_to_multiplicity(self, token: str) -> str:
        """
        Map Mermaid ER crowfoot endpoint token to UML multiplicity text.

        Tokens (Mermaid ER):
        - "||" => exactly one
        - "o|" => zero or one
        - "|{" => one or many
        - "o{" => zero or many
        """
        mapping = {
            "||": "1..1",
            "o|": "0..1",
            "|{": "1..*",
            "o{": "0..*",
        }
        return mapping.get(token, "?")

    def _append_multiplicity_to_relationship_labels(self, mermaid_code: str) -> str:
        """
        For ER diagrams, append explicit UML multiplicities to relationship labels.

        Example:
          CUSTOMER ||--o{ ORDER : places
        becomes:
          CUSTOMER ||--o{ ORDER : "places (1..1 → 0..*)"

        Rules:
        - Only touches relationship lines (outside entity blocks)
        - If label already contains "→" or "1.."/"0.." pattern, it won't append again
        - If label is missing, it creates one like "(1..1 → 0..*)"
        - Keeps Mermaid syntax valid (quotes label if needed)
        """
        lines = mermaid_code.splitlines()
        out = []

        inside_entity = False

        # relationship line regex:
        #   ENTITY_A <left>--<right> ENTITY_B : label(optional)
        rel_re = re.compile(
            r"""^\s*
            (?P<a>\w+)\s+
            (?P<left>\|\||o\||\|\{|o\{)
            -- 
            (?P<right>\|\||o\||\|\{|o\{)
            \s+(?P<b>\w+)
            (?:\s*:\s*(?P<label>.+))?
            \s*$""",
            re.VERBOSE,
        )

        multiplicity_hint_re = re.compile(r"(?:\d\.\.\d|\d\.\.\*|0\.\.\*|1\.\.\*|→)")

        for line in lines:
            s = line.strip()

            # Detect entity block boundaries
            if re.match(r"^\w+\s*\{$", s):
                inside_entity = True
                out.append(line)
                continue
            if inside_entity and s == "}":
                inside_entity = False
                out.append(line)
                continue

            if inside_entity:
                out.append(line)
                continue

            m = rel_re.match(line)
            if not m:
                out.append(line)
                continue

            a = m.group("a")
            b = m.group("b")
            left = m.group("left")
            right = m.group("right")
            label = (m.group("label") or "").strip()

            left_mul = self._crowfoot_to_multiplicity(left)
            right_mul = self._crowfoot_to_multiplicity(right)
            suffix = f"({left_mul} → {right_mul})"

            # If already has multiplicity info, do nothing
            if label and multiplicity_hint_re.search(label):
                out.append(line)
                continue

            # Clean label: remove surrounding quotes if any
            if label.startswith('"') and label.endswith('"') and len(label) >= 2:
                label = label[1:-1].strip()

            if label:
                new_label = f'{label} {suffix}'
            else:
                new_label = suffix

            # Always quote label to be safe (spaces, arrows, etc.)
            new_line = f"    {a} {left}--{right} {b} : \"{new_label}\""
            out.append(new_line)

        return "\n".join(out)

    # ---------------------------
    # Fallback templates
    # ---------------------------

    def _get_enhanced_fallback_template(self, question_data: Dict) -> str:
        title = question_data.get("title", "").lower()
        problem = question_data.get("problemStatement", "").lower()

        is_ecommerce = any(w in (title + " " + problem) for w in ["ecommerce", "e-commerce", "shop", "store", "product", "order"])
        is_library = any(w in (title + " " + problem) for w in ["library", "book", "author", "borrow"])
        is_hospital = any(w in (title + " " + problem) for w in ["hospital", "patient", "doctor", "appointment"])

        if is_library:
            return self._get_library_template()
        if is_hospital:
            return self._get_hospital_template()
        if is_ecommerce:
            return self._get_ecommerce_template()

        return self._get_ecommerce_template()

    def _get_ecommerce_template(self) -> str:
        return """erDiagram
    CATEGORY ||--o{ PRODUCT : contains
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ CUSTOMER_ADDRESS : has
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : included_in
    ORDER ||--|| PAYMENT : has

    CATEGORY {
        int category_id PK
        string category_name
        text description
        int parent_category_id FK
        boolean is_active
        datetime created_at
    }

    PRODUCT {
        int product_id PK
        int category_id FK
        string product_name
        text description
        decimal price
        int stock_quantity
        string sku
        datetime created_at
    }

    CUSTOMER {
        int customer_id PK
        string first_name
        string last_name
        string email
        string phone_number
        string password_hash
        datetime created_at
    }

    CUSTOMER_ADDRESS {
        int address_id PK
        int customer_id FK
        string street_address
        string city
        string state
        string zip_code
        string country
        boolean is_default
    }

    ORDER {
        int order_id PK
        int customer_id FK
        int shipping_address_id FK
        date order_date
        decimal total_amount
        string order_status
        datetime created_at
    }

    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }

    PAYMENT {
        int payment_id PK
        int order_id FK
        decimal amount
        string payment_method
        string transaction_id
        datetime payment_date
        string payment_status
    }
"""

    def _get_library_template(self) -> str:
        return """erDiagram
    AUTHOR ||--o{ BOOK : writes
    CATEGORY ||--o{ BOOK : contains
    MEMBER ||--o{ LOAN : borrows
    BOOK ||--o{ LOAN : loaned_in
    MEMBER ||--o{ RESERVATION : makes
    BOOK ||--o{ RESERVATION : reserved

    AUTHOR {
        int author_id PK
        string first_name
        string last_name
        date birth_date
        string nationality
        text biography
        datetime created_at
    }

    CATEGORY {
        int category_id PK
        string category_name
        text description
        datetime created_at
    }

    BOOK {
        int book_id PK
        int author_id FK
        int category_id FK
        string title
        string isbn
        int publication_year
        int total_copies
        int available_copies
        datetime created_at
    }

    MEMBER {
        int member_id PK
        string first_name
        string last_name
        string email
        string phone
        date membership_date
        string membership_type
        datetime created_at
    }

    LOAN {
        int loan_id PK
        int member_id FK
        int book_id FK
        date loan_date
        date due_date
        date return_date
        string status
    }

    RESERVATION {
        int reservation_id PK
        int member_id FK
        int book_id FK
        datetime reservation_date
        string status
    }
"""

    def _get_hospital_template(self) -> str:
        return """erDiagram
    PATIENT ||--o{ APPOINTMENT : schedules
    DOCTOR ||--o{ APPOINTMENT : attends
    APPOINTMENT ||--o{ PRESCRIPTION : results_in
    DOCTOR ||--o{ PRESCRIPTION : writes
    PATIENT ||--o{ MEDICAL_RECORD : has
    DEPARTMENT ||--o{ DOCTOR : employs

    PATIENT {
        int patient_id PK
        string first_name
        string last_name
        date date_of_birth
        string gender
        string phone
        string email
        string address
        datetime created_at
    }

    DOCTOR {
        int doctor_id PK
        int department_id FK
        string first_name
        string last_name
        string specialization
        string license_number
        string phone
        string email
        datetime created_at
    }

    DEPARTMENT {
        int department_id PK
        string department_name
        string location
        string phone
        datetime created_at
    }

    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_date
        string reason
        string status
        text notes
    }

    PRESCRIPTION {
        int prescription_id PK
        int appointment_id FK
        int doctor_id FK
        int patient_id FK
        datetime prescription_date
        text medication
        text dosage
        text instructions
    }

    MEDICAL_RECORD {
        int record_id PK
        int patient_id FK
        datetime record_date
        text diagnosis
        text treatment
        text notes
    }
"""

    # ---------------------------
    # Extract + Validate
    # ---------------------------

    def _extract_mermaid_code(self, response_text: str) -> Optional[str]:
        response_text = response_text.strip()

        pattern1 = r"```(?:mermaid)?\s*\n([\s\S]+?)\n```"
        match = re.search(pattern1, response_text)
        if match:
            return match.group(1).strip()

        mermaid_keywords = ["erDiagram", "classDiagram", "sequenceDiagram", "graph", "flowchart", "stateDiagram"]
        for keyword in mermaid_keywords:
            if response_text.startswith(keyword):
                return response_text.strip()

        for keyword in mermaid_keywords:
            if keyword in response_text:
                start_idx = response_text.index(keyword)
                return response_text[start_idx:].strip()

        return None

    def _validate_mermaid(self, code: str, diagram_type: str) -> bool:
        if not code or len(code) < 10:
            return False

        type_keywords = {
            "er": "erDiagram",
            "class": "classDiagram",
            "sequence": "sequenceDiagram",
            "tree": "graph",
            "architecture": "flowchart",
            "flowchart": "flowchart",
        }

        expected_keyword = type_keywords.get(diagram_type, "")
        return code.strip().startswith(expected_keyword)

    # ---------------------------
    # ER Sanitizer + Completeness
    # ---------------------------

    def _clean_mermaid_er_syntax(self, mermaid_code: str) -> str:
        logger.info("Cleaning Mermaid ER syntax...")

        cleaned = re.sub(
            r"\s+(UNIQUE|NOT NULL|NULL|DEFAULT\s+\S+|CHECK\s*\([^)]+\)|AUTO_INCREMENT|SERIAL|PRIMARY KEY|FOREIGN KEY)\b",
            "",
            mermaid_code,
            flags=re.IGNORECASE,
        )

        cleaned = re.sub(r"(\})\s+[^\n]+", r"\1", cleaned)
        cleaned = re.sub(r"\}\s*(\w+\s*\{)", r"}\n\n\1", cleaned)

        lines = cleaned.splitlines()
        out = []
        inside_entity = False
        entity_name = None

        for line in lines:
            s = line.strip()

            if not s:
                if not inside_entity:
                    out.append("")
                continue

            entity_start_match = re.match(r"^(\w+)\s*\{$", s)
            if entity_start_match:
                if inside_entity:
                    out.append("    }")
                    out.append("")

                entity_name = entity_start_match.group(1)
                inside_entity = True
                out.append(f"    {entity_name} {{")
                continue

            if s == "}":
                if inside_entity:
                    inside_entity = False
                    entity_name = None
                    out.append("    }")
                    out.append("")
                continue

            if not inside_entity:
                if any(rel in s for rel in ["||--o{", "||--|{", "}|--|{", "||--||", "o|--||", "o{--||", "--"]):
                    out.append(f"    {s}")
                elif s.startswith("erDiagram"):
                    out.append(s)
                continue

            # inside entity attributes
            line = re.sub(r"\s+(FK|PK)\s+\w+\s*\{.*$", r" \1", line)
            line = line.replace("{", "").replace("}", "")
            line = re.sub(r"\s{2,}", " ", line)
            line = re.sub(r"(--|#).*$", "", line)

            s = line.strip()
            if s:
                parts = s.split()
                if len(parts) >= 2:
                    cleaned_parts = []
                    for j, part in enumerate(parts):
                        if j < 2:
                            cleaned_parts.append(part)
                        elif part in ["PK", "FK"]:
                            cleaned_parts.append(part)
                    out.append(f"        {' '.join(cleaned_parts)}")

        if inside_entity:
            out.append("    }")
            out.append("")

        cleaned = "\n".join(out)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned

    def _validate_er_completeness(self, mermaid_code: str) -> bool:
        lines = mermaid_code.splitlines()
        inside_entity = False
        current_entity = None
        entity_attributes = {}

        for line in lines:
            s = line.strip()

            entity_match = re.match(r"^(\w+)\s*\{$", s)
            if entity_match:
                current_entity = entity_match.group(1)
                inside_entity = True
                entity_attributes[current_entity] = []
                continue

            if s == "}":
                inside_entity = False
                current_entity = None
                continue

            if inside_entity and s and current_entity:
                parts = s.split()
                if len(parts) >= 2:
                    entity_attributes[current_entity].append(s)

        empty_entities = [e for e, attrs in entity_attributes.items() if len(attrs) == 0]
        if empty_entities:
            logger.warning(f"Empty entities: {empty_entities}")
            return False
        return True

    def _fix_incomplete_entities(self, mermaid_code: str) -> str:
        lines = mermaid_code.splitlines()
        out = []
        inside_entity = False
        current_entity = None
        entity_has_attributes = False

        for line in lines:
            s = line.strip()

            entity_match = re.match(r"^(\w+)\s*\{$", s)
            if entity_match:
                if inside_entity and not entity_has_attributes and current_entity:
                    out.append(f"        int {current_entity.lower()}_id PK")
                    out.append("        string name")
                    out.append("        datetime created_at")
                    out.append("    }")
                    out.append("")

                current_entity = entity_match.group(1)
                inside_entity = True
                entity_has_attributes = False
                out.append(line)
                continue

            if s == "}":
                if inside_entity and not entity_has_attributes and current_entity:
                    out.append(f"        int {current_entity.lower()}_id PK")
                    out.append("        string name")
                    out.append("        datetime created_at")

                inside_entity = False
                current_entity = None
                entity_has_attributes = False
                out.append(line)
                continue

            if inside_entity and s:
                entity_has_attributes = True

            out.append(line)

        return "\n".join(out)


# Singleton instance
diagram_generator = DiagramGenerator()