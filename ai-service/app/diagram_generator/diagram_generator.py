# app/diagram_generator/diagram_generator.py
"""
Génère du code Mermaid pour les diagrammes en utilisant Gemini AI
"""

import os
import json
import re
from typing import Dict, Optional
import google.generativeai as genai


class DiagramGenerator:
    """Génère du code Mermaid pour différents types de diagrammes"""
    
    def __init__(self):
        """Initialize Gemini AI"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    async def generate_diagram_code(
        self,
        question_data: Dict,
        diagram_type: str
    ) -> Optional[str]:
        """
        Génère du code Mermaid pour un diagramme
        
        Args:
            question_data: Données de la question
            diagram_type: 'er', 'class', 'sequence', 'tree', 'architecture', 'flowchart'
        
        Returns:
            Code Mermaid (string) ou None si échec
        """
        prompt = self._build_prompt(question_data, diagram_type)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.3,  # Bas pour consistance
                    'top_p': 0.8,
                    'top_k': 40,
                }
            )
            
            mermaid_code = self._extract_mermaid_code(response.text)
            
            if not mermaid_code:
                print(f"⚠️ No valid Mermaid code extracted from response")
                return None
            
            # Validation basique
            if not self._validate_mermaid(mermaid_code, diagram_type):
                print(f"⚠️ Invalid Mermaid syntax detected")
                return None
            
            return mermaid_code
            
        except Exception as e:
            print(f"❌ Error generating diagram: {e}")
            return None
    
    def _build_prompt(self, question_data: Dict, diagram_type: str) -> str:
        """Construit le prompt selon le type de diagramme"""
        
        title = question_data.get('title', '')
        problem_statement = question_data.get('problemStatement', '')
        
        base_instructions = """
You are an expert at creating technical diagrams using Mermaid syntax.

CRITICAL RULES:
1. Return ONLY Mermaid code, no explanations
2. Do NOT use markdown code blocks (no ```mermaid)
3. Start directly with the diagram type keyword
4. Keep it clean, professional, and readable
5. Use proper Mermaid syntax only
        """
        
        if diagram_type == 'er':
            return f"""{base_instructions}

TASK: Generate an ER Diagram (Entity-Relationship) for this SQL/Database question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid erDiagram syntax
- Show all tables mentioned in the problem
- Include primary keys (PK) and foreign keys (FK)
- Show relationships with correct cardinality (||--o{{, }}o--||, etc.)
- Include relevant column types
- Keep column names concise

Example format:
erDiagram
    CUSTOMER ||--o{{ ORDER : places
    ORDER ||--|{{ LINE-ITEM : contains
    CUSTOMER {{
        int customer_id PK
        string name
        string email
    }}
    ORDER {{
        int order_id PK
        int customer_id FK
        date order_date
    }}

Return ONLY the Mermaid code, starting with 'erDiagram'.
"""
        
        elif diagram_type == 'class':
            return f"""{base_instructions}

TASK: Generate a UML Class Diagram for this OOP/Backend question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid classDiagram syntax
- Show all classes mentioned
- Include key attributes and methods
- Show inheritance (--|>), composition (--*), aggregation (--o)
- Use proper visibility (+public, -private, #protected)

Example format:
classDiagram
    class Animal {{
        +String name
        +int age
        +makeSound()
    }}
    class Dog {{
        +String breed
        +bark()
    }}
    Animal <|-- Dog

Return ONLY the Mermaid code, starting with 'classDiagram'.
"""
        
        elif diagram_type == 'sequence':
            return f"""{base_instructions}

TASK: Generate a Sequence Diagram for this API/Backend flow question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid sequenceDiagram syntax
- Show all actors/systems involved
- Include request/response flows
- Add notes for important steps
- Show async operations if relevant

Example format:
sequenceDiagram
    participant Client
    participant API
    participant Database
    
    Client->>API: POST /login
    API->>Database: Validate credentials
    Database-->>API: User found
    API-->>Client: JWT token

Return ONLY the Mermaid code, starting with 'sequenceDiagram'.
"""
        
        elif diagram_type == 'tree':
            return f"""{base_instructions}

TASK: Generate a Tree/Graph visualization for this algorithm question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid graph TD (top-down) or LR (left-right) syntax
- Show the data structure clearly
- Label nodes with values
- Use appropriate arrows for relationships

Example format:
graph TD
    A[5] --> B[3]
    A --> C[8]
    B --> D[1]
    B --> E[4]

Return ONLY the Mermaid code, starting with 'graph TD' or 'graph LR'.
"""
        
        elif diagram_type == 'architecture':
            return f"""{base_instructions}

TASK: Generate a System Architecture Diagram for this design question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid flowchart syntax
- Show all components (load balancer, servers, database, cache, etc.)
- Indicate data flow with arrows
- Group related components in subgraphs

Example format:
flowchart TD
    LB[Load Balancer]
    LB --> S1[Server 1]
    LB --> S2[Server 2]
    S1 --> DB[(Database)]
    S2 --> DB

Return ONLY the Mermaid code, starting with 'flowchart TD' or 'flowchart LR'.
"""
        
        else:  # flowchart
            return f"""{base_instructions}

TASK: Generate a Flowchart for this algorithm/logic question.

Question Title: {title}
Problem Statement: {problem_statement}

Requirements:
- Use Mermaid flowchart syntax
- Show decision points with diamonds {{{{ }}}}
- Show process steps with rectangles [ ]
- Include start/end nodes

Example format:
flowchart TD
    Start([Start])
    Start --> Check{{"Is n > 0?"}}
    Check -->|Yes| Process[Process data]
    Check -->|No| End([End])
    Process --> End

Return ONLY the Mermaid code, starting with 'flowchart TD'.
"""
    
    def _extract_mermaid_code(self, response_text: str) -> Optional[str]:
        """Extrait le code Mermaid de la réponse"""
        # Enlever les markdown code blocks si présents
        response_text = response_text.strip()
        
        # Pattern 1: Code dans ```mermaid ... ```
        pattern1 = r'```(?:mermaid)?\s*\n([\s\S]+?)\n```'
        match = re.search(pattern1, response_text)
        if match:
            return match.group(1).strip()
        
        # Pattern 2: Code direct (pas de markdown)
        # Vérifier si commence par un mot-clé Mermaid
        mermaid_keywords = ['erDiagram', 'classDiagram', 'sequenceDiagram', 'graph', 'flowchart', 'stateDiagram']
        for keyword in mermaid_keywords:
            if response_text.startswith(keyword):
                return response_text.strip()
        
        # Pattern 3: Chercher le premier keyword dans le texte
        for keyword in mermaid_keywords:
            if keyword in response_text:
                # Extraire du keyword jusqu'à la fin
                start_idx = response_text.index(keyword)
                return response_text[start_idx:].strip()
        
        return None
    
    def _validate_mermaid(self, code: str, diagram_type: str) -> bool:
        """Validation basique de la syntaxe Mermaid"""
        if not code or len(code) < 10:
            return False
        
        # Vérifier que le code commence par le bon type
        type_keywords = {
            'er': 'erDiagram',
            'class': 'classDiagram',
            'sequence': 'sequenceDiagram',
            'tree': 'graph',
            'architecture': 'flowchart',
            'flowchart': 'flowchart'
        }
        
        expected_keyword = type_keywords.get(diagram_type, '')
        if not code.strip().startswith(expected_keyword):
            return False
        
        # Vérifications basiques de syntaxe
        # (Plus de validations peuvent être ajoutées)
        
        return True
    def _clean_mermaid_er_syntax(self, mermaid_code: str) -> str:
        """
        Clean invalid Mermaid ER syntax by removing constraints
        """
        logger.info("🧹 Cleaning Mermaid ER syntax...")
        
        # Remove common constraint keywords that break Mermaid
        invalid_keywords = [
            r'\s+UNIQUE',
            r'\s+NOT NULL',
            r'\s+NULL',
            r'\s+DEFAULT\s+\S+',
            r'\s+CHECK\s*\([^)]+\)',
            r'\s+AUTO_INCREMENT',
            r'\s+SERIAL',
        ]
        
        cleaned = mermaid_code
        
        for pattern in invalid_keywords:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        # Also remove any text after } on the same line
        cleaned = re.sub(r'(\})\s*[^\n]+', r'\1', cleaned)
        
        logger.info("✅ Mermaid syntax cleaned")
        return cleaned
    
    async def generate_er_diagram(self, topic: str, context: str = "") -> str:
        """
        Generate ER diagram with syntax cleaning
        """
        logger.info(f"🎨 Generating ER diagram for: {topic}")
        
        try:
            # Generate with Gemini
            prompt = self._generate_er_diagram_prompt(topic, context)
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2048
                )
            )
            
            mermaid_code = response.text.strip()
            
            # ✅ CLEAN the generated code
            mermaid_code = self._clean_mermaid_er_syntax(mermaid_code)
            
            # Remove markdown code blocks if present
            mermaid_code = re.sub(r'```mermaid\n?', '', mermaid_code)
            mermaid_code = re.sub(r'```\n?', '', mermaid_code)
            mermaid_code = mermaid_code.strip()
            
            logger.info(f"✅ ER diagram generated ({len(mermaid_code)} chars)")
            
            return mermaid_code
            
        except Exception as e:
            logger.error(f"❌ Error generating ER diagram: {e}")
            raise


# Singleton instance
diagram_generator = DiagramGenerator()