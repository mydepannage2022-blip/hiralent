import json
import google.generativeai as genai
from typing import Any, Dict, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import settings


class GeminiClient:
    """
    Thin, controlled wrapper around Gemini for Hiralent:

    - JD parsing / skills extraction:
        Returns structured JSON that maps cleanly into:
        - SkillsAnalysis (Python)
        - EnhancedAssessmentData
        - EmployerAssessment.extracted_skills / enhanced_data

    - Chatbot-guided flow:
        Uses per-session context (job + assessment_data + history)
        to help employers design assessments; no global memory,
        no external RAG.
    """

    def __init__(self) -> None:
        # Configure Google SDK if key exists
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)

        # Base chat model used everywhere
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.7,
            google_api_key=settings.GOOGLE_API_KEY,
            max_tokens=2048,
        )

        # Fixed brain for this service
        self.system_prompt = SystemMessage(
            content=(
                "You are an expert technical assessment designer for Hiralent. "
                "Your job is to help employers create precise, fair, and role-aligned "
                "skill assessments based ONLY on the information provided in the context "
                "and the ongoing conversation.\n\n"
                "Responsibilities:\n"
                "- Read job information and employer inputs carefully.\n"
                "- Identify relevant technical skills, domains, tools, and technologies.\n"
                "- Suggest question types (coding, MCQ) "
                "  and distributions aligned with the role and experience level.\n"
                "- Ask focused clarifying questions when information is missing.\n"
                "- When enough information is available, propose a structured assessment "
                "  plan (sections, counts, difficulty, time) that can be converted into "
                "  an AssessmentRequirements object by the backend.\n"
                "- Never invent company policies or use external private data. "
                "  Stay strictly within the provided context.\n"
            )
        )

        # Generic prompt template:
        # - system instructions
        # - chat_history (per-session, injected by caller)
        # - final human input (with optional context)
        self.prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt.content),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ]
        )

    # =========================
    # Chatbot: per-session reply
    # =========================

    async def generate_response(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Generate a chatbot reply for ONE employer session.

        Chatbot logic is unchanged.
        """
        try:
            # Build a compact context block injected before the user input
            context_block = self._format_context_block(context)
            enhanced_input = (
                f"{context_block}\n\nUser: {user_input}"
                if context_block
                else user_input
            )

            # Convert persisted history into LangChain messages
            history_messages: List[BaseMessage] = (
                self._convert_history(chat_history) if chat_history else []
            )

            # Build final prompt for this call
            prompt = self.prompt_template.format_prompt(
                chat_history=history_messages,
                input=enhanced_input,
            )

            # Call Gemini
            result = await self.llm.agenerate([prompt.to_messages()])
            response_text = result.generations[0][0].text

            return response_text.strip()

        except Exception as e:
            # Graceful degradation for UX
            return (
                "I’m sorry, I ran into an internal issue while generating this step. "
                "Please adjust your input or try again. "
                f"(debug: {str(e)})"
            )

    # ==================================
    # JD Parsing: structured skill extract
    # ==================================

    async def extract_skills_advanced(
        self,
        job_description: str,
        job_title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a job description (and optional job title) and return structured information
        matching your SkillsAnalysis-compatible shape.
        """

        # Build a richer context block for Gemini
        title_block = f"JOB TITLE: {job_title}\n\n" if job_title else ""
        jd_block = f"JOB DESCRIPTION:\n{job_description}"

        extraction_prompt = f"""
You are an expert technical recruiter and assessment designer.

Your task is to analyze the following job information (title + description) and extract structured information.

{title_block}{jd_block}

Return ONLY a single valid JSON object with these EXACT keys:

- "technical_skills": array of specific technical skills explicitly mentioned or very strongly implied
    (e.g. ["Python","FastAPI","React","TypeScript","SQL"]).
    → Be exhaustive. Include all relevant languages, frameworks, libraries, databases, cloud services,
      data tools, MLOps tools, CI/CD tools, container/orchestration tools, etc.
      Include explicit cloud resources like "AWS EC2", "AWS Lambda", "AWS S3" as separate items when they appear.

- "experience_level": one of ["entry", "mid", "senior", "executive"].
    → Use the strongest signal from the title ("Senior", "Lead", "Principal") and from the text
      ("5+ years", "10+ years", etc.). If it clearly looks senior/lead, do NOT downgrade to "mid".

- "domains": array of domains/areas, chosen from generic strings like
    ["backend", "frontend", "fullstack", "data", "devops", "mobile", "ecommerce", "security", "cloud", "ai", "ml"]
    or other clear domains found in the description.
    → Do NOT use vague words such as "design", "environment", "team", "company" as domains.

- "tools_platforms": array of tools, frameworks, platforms
    (e.g. ["PostgreSQL","Redis","Docker","Kubernetes","AWS","GitHub Actions","Linux","Kafka"]).
    → Include databases, caches, message brokers, CI/CD tools, operating systems, monitoring tools, etc.

- "key_technologies": array of the main technologies to focus the assessment on
    (a subset of the MOST important skills/tools for this role).
    → Usually 5–10 items, focusing on languages, frameworks, cloud stack and critical infrastructure.

- "job_complexity": one of ["low", "medium", "high"] based on scale, architecture, and responsibilities.

- "primary_domain": a single string, the main domain
    (e.g. "backend", "frontend", "fullstack", "data", "devops", "ecommerce", "cloud").

- "categories": array of suggested assessment categories,
    e.g. ["coding","mcq","system_design","debugging","architecture","devops","leadership"].

- "question_recommendations": array of objects:
    [
      {{
        "category": "coding" | "mcq",
        "count": integer (suggested number of questions),
        "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
      }},
      ...
    ]

- "confidence_score": float between 0 and 1 indicating how confident you are in this extraction.

Rules:
- Use ONLY the information in the job title and description or very strong implications.
- Capture ALL relevant technologies and tools; avoid being conservative.
- Avoid vague domain labels like "design", "environment", "team".
- Consider both the wording (e.g. "Senior", "Lead", "Principal") and years of experience when deciding "experience_level".
- If the description clearly indicates a senior or higher level, do NOT downgrade it to "mid" without a strong reason.
- Do NOT include any explanation, comments, or markdown.
- Do NOT wrap the JSON in ``` or any other fences.
- The first character of your response MUST be '{{' and the last character MUST be '}}'.
- Ensure the JSON is syntactically valid.
"""

        try:
            response = await self.llm.agenerate(
                [[HumanMessage(content=extraction_prompt)]]
            )
            response_text = response.generations[0][0].text

            cleaned = self._clean_json_response(response_text)
            return self._parse_json_response(cleaned)

        except Exception as e:
            print(f"Gemini extraction error: {e}")
            return self._get_fallback_response()

    # =========================
    # Helpers
    # =========================

    def _format_context_block(
        self, context: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        if not context:
            return None

        parts: List[str] = []

        job_title = context.get("job_title")
        if job_title:
            parts.append(f"Job Title: {job_title}")

        exp = context.get("experience_level")
        if exp:
            parts.append(f"Target Experience Level: {exp}")

        current_step = context.get("current_step")
        if current_step:
            parts.append(f"Current Step: {current_step}")

        assessment_data = context.get("assessment_data")
        if assessment_data:
            try:
                serialized = json.dumps(assessment_data)
                # Avoid huge prompts; trim
                if len(serialized) > 800:
                    serialized = serialized[:800] + "..."
                parts.append(f"Current Assessment Preferences: {serialized}")
            except TypeError:
                pass

        job_desc = context.get("job_description")
        if job_desc:
            trimmed = job_desc.strip()
            if len(trimmed) > 600:
                trimmed = trimmed[:600] + "..."
            parts.append(f"Job Description (excerpt): {trimmed}")

        if not parts:
            return None

        return "Context:\n" + "\n".join(parts)

    def _convert_history(
        self, chat_history: List[Dict[str, Any]]
    ) -> List[BaseMessage]:
        messages: List[BaseMessage] = []
        for msg in chat_history:
            role = msg.get("type")
            content = (msg.get("content") or "").strip()
            if not content:
                continue

            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
            elif role == "system":
                messages.append(SystemMessage(content=content))

        return messages

    def _clean_json_response(self, response_text: str) -> str:
        import re

        if not response_text:
            return "{}"

        cleaned = re.sub(r"```json\s*|\s*```", "", response_text).strip()

        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")

        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            return cleaned[first_brace : last_brace + 1].strip()

        return "{}"

    def _parse_json_response(self, json_text: str) -> Dict[str, Any]:
        try:
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}. Raw text snippet: {json_text[:200]}")
            return self._get_fallback_response()
        except Exception as e:
            print(f"Unexpected JSON parse error: {e}. Raw text snippet: {json_text[:200]}")
            return self._get_fallback_response()

    def _get_fallback_response(self) -> Dict[str, Any]:
        return {
            "technical_skills": [],
            "experience_level": "mid",
            "domains": ["general"],
            "tools_platforms": [],
            "key_technologies": [],
            "job_complexity": "medium",
            "primary_domain": "general",
            "categories": ["coding", "mcq"],
            "question_recommendations": [],
            "confidence_score": 0.5,
        }


# Singleton instance reused across app
gemini_client = GeminiClient()
