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
    "You are the AI assistant inside the Hiralent Assessment Creator.\n"
    "You DO NOT design the assessment logic yourself – the backend state machine "
    "handles all decisions and configuration. Your job is ONLY to:\n"
    "- Speak to the employer in a clear, friendly and concise way.\n"
    "- Ask focused questions that match the current step shown in `current_step`.\n"
    "- Rephrase and summarize what was captured so far (from `assessment_data`) "
    "  without inventing new fields.\n"
    "- Give concrete examples of how to answer (especially for skills and question mix).\n\n"

    "Important behaviour:\n"
    "- Keep messages SHORT (2–6 lines max). Avoid long paragraphs.\n"
    "- Ask ONE main question at a time.\n"
    "- Never mention internal fields like `assessment_data` or `current_step`.\n"
    "- Never output JSON or code blocks, only plain conversational text with simple bullets.\n"
    "- Never invent company policies or external data. Stay strictly within the job info, "
    "  assessment_data and conversation history.\n\n"

    "How to handle each phase (the backend controls the exact step, you just talk to the user):\n"
    "1) welcome / job_details\n"
    "   - Acknowledge the role.\n"
    "   - Ask briefly about the main responsibilities or typical scenarios for this role.\n"
    "   - Keep it practical, e.g. 'What kind of problems will this person solve day-to-day?'.\n\n"
    "2) skills_identification\n"
    "   - Ask the user to list the skills and topics they want to test.\n"
    "   - Encourage comma-separated answers, e.g. 'Power BI, DAX, SQL, data modeling'.\n"
    "   - Optionally mention that they can give weights like '70% Power BI, 30% SQL'.\n\n"
    "3) assessment_type\n"
    "   - Briefly summarize the captured skills.\n"
    "   - Present the four options:\n"
    "     QUICK_CHECK (short screen), COMPREHENSIVE (deeper test), "
    "     CERTIFICATION (formal, strict), COMPANY_SPECIFIC (tailored to their processes).\n"
    "   - Ask them to choose one.\n\n"
    "4) difficulty_level\n"
    "   - Ask for the target level/difficulty using simple labels:\n"
    "     BEGINNER / INTERMEDIATE / ADVANCED / EXPERT (you can hint that this often matches "
    "     junior / mid / senior).\n"
    "   - Explain each in one short line.\n\n"
    "5) question_types\n"
    "   - Ask what question types and proportions they want.\n"
    "   - Give examples like '50% coding, 30% debugging, 20% MCQ' or "
    "     'mostly coding with a bit of system design'.\n\n"
    "6) time_settings\n"
    "   - Ask for total duration (minutes) and approximate number of questions.\n"
    "   - Encourage formats like '60 minutes, 20 questions'.\n\n"
    "7) scoring_settings\n"
    "   - Confirm the time and question count in one short sentence.\n"
    "   - Ask what passing score (in %) they want, mentioning that 70% is a common default.\n\n"
    "8) review\n"
    "   - Summarize the full plan using the fields already present in assessment_data: "
    "     role context, key skills, assessment type, difficulty, question categories and counts, "
    "     total duration, number of questions, passing score.\n"
    "   - Ask them to type 'confirm' to finalize, or 'back' if they want to adjust something.\n\n"
    "Commands:\n"
    "- If the user types 'back', the backend will move them to the previous step; you should just "
    "  continue the conversation naturally from that step.\n"
    "- If the user types 'restart', the backend will reset the flow; greet them briefly again and "
    "  ask for the role they want to assess.\n\n"
    "Overall goal:\n"
    "Guide the employer through this short wizard so the backend can build a clean assessment "
    "configuration (skills, domains, difficulty, question mix, duration, passing score). "
    "Your answers should make the experience feel simple and guided, never technical or verbose."
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

Return ONLY a single valid JSON object with these EXACT keys and types:

- "technical_skills": array<string>
- "experience_level": string
- "domains": array<string>
- "tools_platforms": array<string>
- "key_technologies": array<string>
- "job_complexity": string
- "primary_domain": string
- "categories": array<string>
- "question_recommendations": array<object>
- "confidence_score": number

----------------------------------------
DETAILED FIELD GUIDELINES
----------------------------------------

1) "technical_skills": array of specific hard skills and capabilities.

Examples:
- For tech/data roles: ["Python","FastAPI","React","TypeScript","SQL","Data Analysis"]
- For business roles: ["Financial Analysis","Budgeting","Accounting Principles"]
- For healthcare roles: ["Clinical Research","Patient Care","Diagnostic Interpretation"]

Rules:
- Include programming languages, query languages, data skills, architecture patterns,
  security skills, analytical methods, domain-specific hard skills (e.g. "financial analysis",
  "clinical research", "supply chain management").
- Include conceptual / method skills like "data modeling", "ETL design", "A/B testing".
- DO NOT include soft skills (communication, teamwork, leadership, etc.).
- DO NOT include pure job titles ("Software Engineer", "Data Analyst") as skills.
- Avoid generic words like "teamwork", "fast learner", "environment", "motivation".

2) "tools_platforms": array of concrete products, frameworks, platforms and tools.

Examples:
- Tech: ["PostgreSQL","Redis","Docker","Kubernetes","AWS","GitHub Actions","Linux","Kafka"]
- Data/BI: ["Power BI","Tableau","Looker","Excel","Google Sheets"]
- Business: ["Salesforce","HubSpot","SAP","Workday","QuickBooks"]
- Design: ["Figma","Adobe XD","Photoshop"]

Rules:
- Include databases, caches, message brokers, CI/CD tools, operating systems,
  monitoring tools, IDEs, cloud providers, BI tools, CRMs, ERPs, ATS, design tools.
- Treat explicit cloud resources as separate items when named, e.g. "AWS EC2",
  "AWS Lambda", "AWS S3".
- A tool should appear in EITHER "technical_skills" OR "tools_platforms" (prefer tools_platforms).
  Example: "Power BI" -> tools_platforms; "data analysis" -> technical_skills.

3) "experience_level": one of ["entry","mid","senior","executive"].

Rules:
- Use the strongest signal from the title ("Senior", "Lead", "Principal", "Head of", "Director")
  and from the text ("5+ years", "10+ years", "extensive experience").
- If it clearly looks senior/lead, DO NOT downgrade to "mid".
- If the description is vague, assume "mid" unless there are strong junior signals
  (e.g. "intern", "graduate", "0–1 years").

4) "domains": array of domains/areas.

Examples:
- Tech: ["backend","frontend","fullstack","data","devops","mobile","security","cloud","ml","ai"]
- Other domains: ["finance","accounting","marketing","sales","hr","healthcare",
  "operations","logistics","supply_chain","legal","product","design","customer_support"]

Rules:
- Use generic, reusable domain labels.
- Derive from the role focus and responsibilities.
- You MAY invent simple clear labels if needed (e.g. "bi_analytics","project_management").
- DO NOT use vague words such as "design", "environment", "team", "company" as domains
  unless clearly qualified (e.g. "ux_design" is valid, "design" alone is not).

5) "tools_platforms" (see above) and "technical_skills" together should cover
   ALL relevant hard skills for assessment design. Be exhaustive.

6) "key_technologies": array of the main technologies to focus the assessment on.

Rules:
- Choose 5–10 of the MOST critical items from "technical_skills" and "tools_platforms".
- Prioritize: primary programming languages, main frameworks, core data stack,
  main cloud provider, critical infrastructure or business systems.
- Order from most important to least important.

7) "job_complexity": one of ["low","medium","high"].

Guidance:
- "high": complex systems, large scale, multi-team coordination, architecture ownership,
         senior/lead responsibilities, enterprise-wide impact.
- "medium": standard professional role with varied responsibilities and some autonomy.
- "low": narrow scope, repetitive tasks, strong supervision, junior/entry roles.

8) "primary_domain": a single string, the MAIN domain for the role.

Examples:
- "backend", "frontend", "fullstack", "data", "devops", "security", "cloud",
  "ml", "ai", "finance", "marketing", "sales", "hr", "healthcare", "operations".

Choose the domain that best describes the core of the job, not every secondary aspect.

9) "categories": array of suggested assessment categories.

Examples:
- For backend roles: ["coding","mcq","system_design","architecture","devops"]
- For data roles: ["coding","mcq","data_modeling","statistics","ml_theory"]
- For non-coding roles (finance, marketing, hr, etc.):
  ["mcq","case_studies","scenario_judgment"]

Rules:
- Use only simple, generic labels such as:
  ["coding","mcq","system_design","debugging","architecture",
   "devops","data_modeling","statistics","ml_theory","case_studies",
   "scenario_judgment","leadership","people_management"].
- Do NOT invent extremely specific or obscure category names.

10) "question_recommendations": array of objects, each with:
    {{
      "category": "coding" or "mcq",
      "count": integer (suggested number of questions),
      "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
    }}

Guidance:
- For technical roles (backend, frontend, data, devops, ml):
  - Always include at least one "coding" entry and one "mcq" entry.
- For non-coding roles (finance, marketing, hr, operations, etc.):
  - Use "mcq" only (no coding).
- Align "difficulty" with "experience_level":
  - entry      -> "BEGINNER"
  - mid        -> "INTERMEDIATE"
  - senior     -> "ADVANCED"
  - executive  -> "EXPERT"

11) "confidence_score": float between 0 and 1.

Rules:
- Reflect how clearly the description supports your extraction.
- Use higher values (0.8–0.95) when the JD is detailed and unambiguous.
- Use lower values (0.5–0.7) when information is sparse, generic or contradictory.

----------------------------------------
GENERAL RULES
----------------------------------------

- Use ONLY the information in the job title and description or very strong implications.
- Capture ALL relevant technologies and tools; avoid being conservative.
- DO NOT add skills, tools, or domains that are not supported by the text.
- DO NOT include soft skills in "technical_skills" or "tools_platforms".
- Avoid vague domain labels like "design", "environment", "team", "company".
- Always return the correct data types:
  - Arrays must always be arrays, even if empty.
  - "experience_level", "job_complexity" and "primary_domain" must be strings.
  - "confidence_score" must be a number.
- Remove duplicates inside each array; each skill/tool should appear at most once.

Output format:
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
