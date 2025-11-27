from uuid import uuid4
from datetime import datetime
from typing import Dict, Tuple, List, Optional, Any
import re

from app.domain.schemas import (
    ChatbotSession,
    ChatbotMessage,
    ChatbotResponse,
    ChatbotStartRequest,
    ChatbotAssessmentData,
)
from app.services.llm.gemini_client import gemini_client
from app.services.session_store import RedisSessionStore
from app.core.config import settings


# Global Redis store for chatbot sessions (uses URL from settings)
redis_store = RedisSessionStore(settings.REDIS_URL)


class ChatbotEngine:
    """
    Deterministic guided-assessment chatbot.

    - Used when employer wants to DESIGN an assessment explicitly
      (e.g. “80% Python, 20% SQL, senior level, 60 minutes”),
      not when auto-generating from a full JD.

    - State machine only. LLM = wording & UX only.
    - All structured config is stored in `session.assessment_data`.
    """

    STEP_ORDER = [
        "welcome",
        "job_details",           # high-level role / context (not JD parse)
        "skills_identification", # what skills + focus (%)
        "assessment_type",       # QUICK_CHECK / COMPREHENSIVE / ...
        "difficulty_level",      # BEGINNER / INTERMEDIATE / ...
        "question_types",        # categories: coding, mcq, etc.
        "time_settings",         # time_limit + total_questions
        "scoring_settings",      # passing_score
        "review",                # summary + confirm
        "completed",
    ]

    def __init__(self, store: RedisSessionStore = redis_store) -> None:
        # Redis-backed session store
        self.store = store

    # =============== Helpers ===============

    def _now(self) -> datetime:
        return datetime.utcnow()

    def _create_message(self, content: str, mtype: str) -> ChatbotMessage:
        return ChatbotMessage(
            id=str(uuid4()),
            type=mtype,  # "user" | "assistant" | "system"
            content=content,
            timestamp=self._now(),
        )

    async def _get_session(self, session_id: str) -> ChatbotSession:
        session = await self.store.get(session_id)
        if not session:
            raise ValueError("Session not found")
        return session

    async def _save_session(self, session: ChatbotSession) -> None:
        session.updated_at = self._now()
        await self.store.save(session)

    def _normalize(self, text: str) -> str:
        return (text or "").strip().lower()

    def _go_back_step(self, current_step: str) -> str:
        if current_step not in self.STEP_ORDER:
            return "welcome"
        idx = self.STEP_ORDER.index(current_step)
        if idx <= 0:
            return "welcome"
        return self.STEP_ORDER[idx - 1]

    def _build_context(self, session: ChatbotSession) -> Dict[str, Any]:
        """
        Context passed to Gemini so it can respond consistently.
        No business decisions here.
        """
        return {
            "session_id": session.session_id,
            "company_id": session.company_id,
            "job_id": session.job_id,
            "current_step": session.current_step,
            "assessment_data": session.assessment_data.model_dump(),
        }

    def _history_as_dicts(self, session: ChatbotSession) -> List[Dict[str, str]]:
        return [{"type": m.type, "content": m.content} for m in session.messages]

    async def _llm_reply(
        self,
        instruction: str,
        session: ChatbotSession,
        extra_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Centralized LLM call:
        - instruction = what we want it to say (in plain English)
        - uses session context + history for tone/consistency
        """
        context = self._build_context(session)
        if extra_context:
            context.update(extra_context)

        history = self._history_as_dicts(session)

        return await gemini_client.generate_response(
            user_input=instruction,
            context=context,
            chat_history=history,
        )

    # ---------- parsing helpers (atomic data) ----------

    def _parse_skills(self, text: str) -> List[str]:
        """
        Turn free-text like:
          "I want to assess Power Query, DAX and data modeling"
          "I Wnat To Assess: Python, Fastapi, Langgraph"
          "60% Python, 20% MLOps (Docker, Kubernetes, CI/CD),
           10% model deployment (FastAPI), plus problem-solving"

        into:
          ["Power Query", "Dax", "Data Modeling"]
          ["Python", "Fastapi", "Langgraph"]
          ["Python", "Mlops", "Docker", "Kubernetes", "Ci", "Cd",
           "Model Deployment", "Fastapi", "Problem-Solving"]
        """
        if not text:
            return []

        cleaned = text.strip()

        # If there is a colon very early, drop everything before it:
        # "I Wnat To Assess: Python, Fastapi" → " Python, Fastapi"
        colon_idx = cleaned.find(":")
        if 0 <= colon_idx <= 40:
            cleaned = cleaned[colon_idx + 1 :]

        # Remove boilerplate intros like "I want to assess..."
        cleaned = re.sub(
            r"^\s*(i|we)\s+"
            r"(want|wnat|would like|need|plan)\s+to\s+"
            r"(assess|test|evaluate|focus\s+on)\s+",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        # Drop percentages like "60%" / "80 %"
        cleaned = re.sub(r"\b\d+\s*%", "", cleaned)

        # Break parentheses into separate items
        cleaned = cleaned.replace("(", ",").replace(")", ",")

        # Normalize separators
        for sep in ["\n", ";", "/", "+", "|"]:
            cleaned = cleaned.replace(sep, ",")

        # Collapse multiple commas
        cleaned = re.sub(r",\s*,+", ",", cleaned)

        # Split on commas and "and"
        parts = re.split(r",| and ", cleaned, flags=re.IGNORECASE)

        skills: List[str] = []
        seen = set()

        for part in parts:
            s = part.strip()
            if not s:
                continue

            # Remove fillers at the beginning
            s = re.sub(
                r"^(plus|also|mainly|mostly)\s+",
                "",
                s,
                flags=re.IGNORECASE,
            ).strip()
            if not s:
                continue

            # Remove trailing "etc."
            s = re.sub(r"\betc\.?$", "", s, flags=re.IGNORECASE).strip()
            if not s:
                continue

            # For very long fragments (full sentences), keep last few words
            tokens = s.split()
            if len(tokens) > 6:
                s = " ".join(tokens[-3:])

            s = s.strip(" .,:;-")
            if not s:
                continue

            s = s.title()
            key = s.lower()
            if key not in seen:
                seen.add(key)
                skills.append(s)

        return skills

    def _parse_question_mix(self, text: str) -> Dict[str, float]:
        """
        Parse things like '50% coding, 25% system design, 15% debugging, 10% MCQ'
        into a normalized ratio per category.
        """
        if not text:
            return {"MCQ": 1.0}

        lower = text.lower()

        label_map = {
            "coding": "CODING",
            "code": "CODING",
            "system design": "SYSTEM_DESIGN",
            "architecture": "SYSTEM_DESIGN",
            "debugging": "DEBUGGING",
            "bug": "DEBUGGING",
            "mcq": "MCQ",
            "multiple choice": "MCQ",
        }

        mix: Dict[str, float] = {}

        # 1) find "<num>% <label>"
        percent_pattern = re.findall(r"(\d+)\s*%\s*([a-zA-Z ]+)", lower)
        total = 0.0

        for num_str, label_raw in percent_pattern:
            num = int(num_str)
            label_raw = label_raw.strip()
            mapped = None
            for key, val in label_map.items():
                if key in label_raw:
                    mapped = val
                    break
            if not mapped:
                continue

            w = num / 100.0
            mix[mapped] = mix.get(mapped, 0.0) + w
            total += w

        if mix and total > 0:
            # normalize
            for k in list(mix.keys()):
                mix[k] = round(mix[k] / total, 4)
            return mix

        # 2) fallback: detect labels and set equal weights
        detected = set()
        for key, val in label_map.items():
            if key in lower:
                detected.add(val)

        if not detected:
            detected = {"MCQ"}

        w = round(1.0 / len(detected), 4)
        return {cat: w for cat in detected}

    def _build_question_recommendations(
        self,
        mix: Dict[str, float],
        total_questions: int,
        difficulty: Optional[str],
    ) -> List[Dict[str, Any]]:
        """
        Convert a ratio mix + total_questions + difficulty into a list of
        {category, count, difficulty} objects.
        """
        if total_questions <= 0:
            total_questions = 1

        diff = difficulty or "INTERMEDIATE"

        # initial float counts
        float_counts = {
            cat: mix_val * total_questions for cat, mix_val in mix.items()
        }

        # round and fix total
        int_counts = {cat: int(round(c)) for cat, c in float_counts.items()}
        current_total = sum(int_counts.values())

        # Adjust if rounding changed total
        if current_total != total_questions:
            delta = total_questions - current_total
            remainders = sorted(mix.items(), key=lambda kv: kv[1], reverse=True)
            idx = 0
            step = 1 if delta > 0 else -1
            delta_abs = abs(delta)

            while delta_abs > 0 and remainders:
                cat, _ = remainders[idx % len(remainders)]
                new_val = int_counts.get(cat, 0) + step
                if new_val >= 0:
                    int_counts[cat] = new_val
                    delta_abs -= 1
                idx += 1

        recommendations: List[Dict[str, Any]] = []
        for cat, count in int_counts.items():
            if count <= 0:
                continue
            recommendations.append(
                {
                    "category": cat.lower(),  # 'coding', 'mcq', ...
                    "count": count,
                    "difficulty": diff,
                }
            )
        return recommendations

    def _infer_skill_category(self, skills: List[str], role_text: str) -> str:
        """
        Determine a high-level skill_category for the assessment.
        Uses technical_skills + role_context + role_details.
        """
        text = (" ".join(skills) + " " + role_text).lower()

        # ML / AI
        if any(
            k in text
            for k in [
                "ml",
                "machine learning",
                "deep learning",
                "llm",
                "rag",
                "pytorch",
                "tensor",
                "ai",
                "data science",
                "langchain",
                "langgraph",
            ]
        ):
            return "ml_ai"

        # Data engineering / analytics / BI
        if any(
            k in text
            for k in [
                "big data",
                "etl",
                "pipeline",
                "spark",
                "hadoop",
                "warehouse",
                "analytics",
                "bi",
                "power bi",
                "tableau",
            ]
        ):
            return "data"

        # Backend / API / architecture
        if any(
            k in text
            for k in [
                "backend",
                "api",
                "fastapi",
                "django",
                "flask",
                "spring",
                "microservice",
            ]
        ):
            return "backend"

        # Frontend / UI
        if any(
            k in text
            for k in ["frontend", "react", "vue", "angular", "ui", "javascript", "typescript"]
        ):
            return "frontend"

        # DevOps / Cloud / MLOps
        if any(
            k in text
            for k in [
                "kubernetes",
                "docker",
                "terraform",
                "aws",
                "gcp",
                "azure",
                "cloud",
                "ci/cd",
                "cicd",
                "devops",
                "mlops",
            ]
        ):
            return "devops"

        # Fullstack (both FE + BE signals)
        if (
            any(k in text for k in ["react", "vue", "angular"])
            and any(
                k in text
                for k in ["fastapi", "django", "flask", "node", "api", "backend"]
            )
        ):
            return "fullstack"

        return "general"

    # =============== Public API ===============

    async def start_session(self, request: ChatbotStartRequest) -> ChatbotSession:
        """
        Start a new guided chatbot session.

        This flow is for CUSTOM assessment design,
        not automatic parsing of an existing full JD.
        """
        session_id = f"chat_{uuid4().hex[:8]}"

        if request.job_id:
            intro_context = (
                "I see this session is linked to an existing job. "
                "We'll use it as context, but you can override anything."
            )
        else:
            intro_context = (
                "You can describe the role in your own words; "
                "this does not have to match any existing job posting."
            )

        welcome_text = (
            "👋 Welcome to the Hiralent Assessment Creator!\n\n"
            "This assistant helps you design a skills assessment tailored to what YOU want to test.\n"
            f"{intro_context}\n\n"
            "First, briefly describe the role and what kind of candidate you want to assess.\n"
            "For example: 'I need a Python backend developer working with FastAPI and PostgreSQL.'"
        )

        welcome_msg = self._create_message(welcome_text, "assistant")

        initial = request.initial_data or {}

        assessment_data = ChatbotAssessmentData(
            assessment_id=initial.get("assessment_id"),
            job_title=initial.get("job_title"),
            job_description=initial.get("job_description"),
            specific_requirements=initial.get("specific_requirements", []) or [],
        )

        session = ChatbotSession(
            session_id=session_id,
            company_id=request.company_id,
            job_id=request.job_id,
            messages=[welcome_msg],
            current_step="welcome",
            created_at=self._now(),
            updated_at=self._now(),
            assessment_data=assessment_data,
            method="chatbot_guided",
        )

        await self._save_session(session)
        return session

    async def process_message(
        self,
        session_id: str,
        user_message: str,
    ) -> ChatbotResponse:
        """
        Handle a user message and progress the wizard.
        Always returns full updated session + latest reply.
        """
        session = await self._get_session(session_id)

        # Append user message
        session.messages.append(self._create_message(user_message, "user"))
        norm = self._normalize(user_message)

        # Global commands (deterministic)
        if norm in {"restart", "/restart", "reset", "start over"}:
            reply = await self._handle_restart(session)
            session.messages.append(self._create_message(reply, "assistant"))
            await self._save_session(session)
            return ChatbotResponse(session=session, reply=reply, is_completed=False)

        if norm in {"back", "/back"}:
            reply = await self._handle_back(session)
            session.messages.append(self._create_message(reply, "assistant"))
            await self._save_session(session)
            return ChatbotResponse(session=session, reply=reply, is_completed=False)

        # Normal step-based handling
        reply, is_completed = await self._handle_step(session, user_message)

        session.messages.append(self._create_message(reply, "assistant"))
        await self._save_session(session)

        return ChatbotResponse(session=session, reply=reply, is_completed=is_completed)

    # =============== Commands ===============

    async def _handle_restart(self, session: ChatbotSession) -> str:
        session.current_step = "welcome"
        session.assessment_data = ChatbotAssessmentData(
            assessment_id=session.assessment_data.assessment_id,
            job_title=session.assessment_data.job_title,
            job_description=session.assessment_data.job_description,
            specific_requirements=session.assessment_data.specific_requirements,
        )
        session.messages.append(
            self._create_message("[system] Conversation restarted.", "system")
        )
        return (
            "No problem 👍 Let's start fresh.\n"
            "Please describe the role and what you want to assess."
        )

    async def _handle_back(self, session: ChatbotSession) -> str:
        prev_step = self._go_back_step(session.current_step)
        session.current_step = prev_step
        session.messages.append(
            self._create_message(f"[system] Moved back to: {prev_step}", "system")
        )

        # Deterministic prompts per step
        if prev_step == "welcome":
            return "You're back at the beginning. Describe the role and target profile."
        if prev_step == "job_details":
            return "Tell me more precisely what this role will do so we can align the assessment."
        if prev_step == "skills_identification":
            return "List the key skills and topics you want to evaluate (e.g. Python, SQL, APIs)."
        if prev_step == "assessment_type":
            return (
                "Choose the assessment type: QUICK_CHECK, COMPREHENSIVE, "
                "CERTIFICATION, or COMPANY_SPECIFIC."
            )
        if prev_step == "difficulty_level":
            return (
                "Choose the target difficulty: BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT."
            )
        if prev_step == "question_types":
            return (
                "Specify what question types you want (e.g. coding, mcq, debugging, "
                "system_design) and their importance."
            )
        if prev_step == "time_settings":
            return (
                "Define total duration (minutes) and approximate number of questions."
            )
        if prev_step == "scoring_settings":
            return (
                "Set the passing score (in %) for this assessment. "
                "Default is 70% if you don't specify."
            )
        if prev_step == "review":
            return (
                "Review the current assessment config. Type 'confirm' when you're happy."
            )

        return "Let's continue."

    # =============== Step Machine ===============

    async def _handle_step(
        self,
        session: ChatbotSession,
        user_message: str,
    ) -> Tuple[str, bool]:
        step = session.current_step
        norm = self._normalize(user_message)
        data = session.assessment_data

        # --- welcome -> job_details ---
        if step == "welcome":
            data.role_context = user_message.strip()
            session.current_step = "job_details"

            instruction = (
                "The user described the role/need. "
                "Acknowledge concisely and ask them to clarify what kind of scenarios or responsibilities "
                "the hire will handle, to better shape the assessment."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- job_details -> skills_identification ---
        if step == "job_details":
            data.role_details = user_message.strip()
            session.current_step = "skills_identification"

            instruction = (
                "Based on the role context so far, ask the user to list the key skills/topics "
                "they want to evaluate. Encourage specific focus like '80% Python (functions, lists), "
                "20% SQL', 'API design', 'problem solving', etc."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- skills_identification -> assessment_type ---
        if step == "skills_identification":
            raw = user_message.strip()
            data.skills_raw_input = raw

            # 1️⃣ Try to parse skills directly from the user reply
            parsed_skills = self._parse_skills(raw)

            # Heuristic: if what we parsed looks like "confirmation sentences"
            # (all chunks are long, >4 words), then fallback to the last
            # assistant message (which usually contains the bullet list).
            def looks_like_confirmation(skills: List[str]) -> bool:
                if not skills:
                    return True
                long_chunks = [s for s in skills if len(s.split()) > 4]
                return len(long_chunks) == len(skills)

            if looks_like_confirmation(parsed_skills):
                assistant_msgs = [m for m in session.messages if m.type == "assistant"]
                if assistant_msgs:
                    last_ai = assistant_msgs[-1].content
                    ai_skills = self._parse_skills(last_ai)
                    if ai_skills:
                        parsed_skills = ai_skills

            # Store clean technical skills + extracted_skills
            data.technical_skills = parsed_skills
            data.extracted_skills = parsed_skills

            # Domains based on skills + raw text + previous context
            combined_lower = (
                raw + " " + (data.role_context or "") + " " + (data.role_details or "")
            ).lower()
            domains: List[str] = []

            # ML / AI / LLM
            if any(
                k in combined_lower
                for k in [
                    "ml",
                    "machine learning",
                    "deep learning",
                    "llm",
                    "rag",
                    "ai",
                    "data science",
                    "langchain",
                    "langgraph",
                    "mlops",
                ]
            ):
                domains.append("ml_ai")

            # Data / BI / analytics
            if any(
                k in combined_lower
                for k in ["data", "sql", "analytics", "power bi", "tableau", "bi"]
            ):
                domains.append("data")

            # Backend / APIs
            if any(k in combined_lower for k in ["backend", "api", "fastapi", "django", "flask"]):
                domains.append("backend")

            # Frontend
            if any(k in combined_lower for k in ["frontend", "react", "vue", "angular"]):
                domains.append("frontend")

            # DevOps
            if any(
                k in combined_lower
                for k in ["devops", "docker", "kubernetes", "ci/cd", "cicd", "terraform"]
            ):
                domains.append("devops")

            # Deduplicate and ensure at least "general"
            normalized_domains: List[str] = []
            seen = set()
            for d in domains:
                key = d.lower()
                if key not in seen:
                    seen.add(key)
                    normalized_domains.append(d)

            if not normalized_domains:
                normalized_domains = ["general"]

            data.domains = normalized_domains

            session.current_step = "assessment_type"

            instruction = (
                "Summarize the captured skills/focus areas briefly. "
                "Then present assessment type options:\n"
                "- QUICK_CHECK: short screening\n"
                "- COMPREHENSIVE: deeper evaluation\n"
                "- CERTIFICATION: formal & strict\n"
                "- COMPANY_SPECIFIC: tailored to company processes\n"
                "Ask the user which one they prefer."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- assessment_type -> difficulty_level ---
        if step == "assessment_type":
            mapping = {
                "quick_check": "QUICK_CHECK",
                "quick": "QUICK_CHECK",
                "screening": "QUICK_CHECK",
                "comprehensive": "COMPREHENSIVE",
                "full": "COMPREHENSIVE",
                "certification": "CERTIFICATION",
                "certified": "CERTIFICATION",
                "company_specific": "COMPANY_SPECIFIC",
                "custom": "COMPANY_SPECIFIC",
            }

            selected = None
            for key, val in mapping.items():
                if key in norm:
                    selected = val
                    break

            if not selected and norm in {
                "quick_check",
                "comprehensive",
                "certification",
                "company_specific",
            }:
                selected = norm.upper()

            if not selected:
                msg = (
                    "Please choose one of: QUICK_CHECK, COMPREHENSIVE, "
                    "CERTIFICATION, or COMPANY_SPECIFIC."
                )
                return msg, False

            data.assessment_type = selected
            session.current_step = "difficulty_level"

            instruction = (
                f"The user chose {selected}. "
                "Now ask which difficulty level to target: "
                "BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT. "
                "Explain each in one line."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- difficulty_level -> question_types ---
        if step == "difficulty_level":
            diff_map = {
                "beginner": "BEGINNER",
                "junior": "BEGINNER",
                "intermediate": "INTERMEDIATE",
                "mid": "INTERMEDIATE",
                "advanced": "ADVANCED",
                "senior": "ADVANCED",
                "expert": "EXPERT",
            }

            selected = None
            for key, val in diff_map.items():
                if key in norm:
                    selected = val
                    break

            if not selected:
                return (
                    "Please choose a difficulty: BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT.",
                    False,
                )

            data.difficulty = selected
            session.current_step = "question_types"

            instruction = (
                "Now ask the user which question types they want to include and in what proportion. "
                "Options: coding, mcq, debugging, system_design, architecture, etc. "
                "Encourage answers like '50% coding, 25% system design, 15% debugging, 10% MCQ'."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- question_types -> time_settings ---
        if step == "question_types":
            raw = user_message.strip()
            data.question_types_raw = raw

            mix = self._parse_question_mix(raw)

            categories = list(mix.keys())
            data.question_categories = categories
            data.question_mix = mix

            session.current_step = "time_settings"

            instruction = (
                "Thank the user for specifying question types and proportions. "
                "Now ask them for the total duration (in minutes) and approximate number of questions "
                "they want in this assessment. Encourage a format like '60 minutes, 20 questions'."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- time_settings -> scoring_settings ---
        if step == "time_settings":
            numbers = [int(n) for n in re.findall(r"\d+", user_message)]
            time_limit = numbers[0] if numbers else 60
            total_questions = numbers[1] if len(numbers) > 1 else 20

            data.time_limit = time_limit
            data.total_questions = total_questions

            # build question_recommendations here
            mix = data.question_mix or {"MCQ": 1.0}
            difficulty = data.difficulty or "INTERMEDIATE"
            recommendations = self._build_question_recommendations(
                mix,
                total_questions,
                difficulty,
            )
            data.question_recommendations = recommendations

            session.current_step = "scoring_settings"

            instruction = (
                "Summarize the duration and question count you captured. "
                "Then ask the user what passing score (in %) should be required. "
                "Default is 70% if they are not sure."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- scoring_settings -> review ---
        if step == "scoring_settings":
            nums = [int(n) for n in re.findall(r"\d+", user_message)]
            passing_score = None
            for n in nums:
                if 30 <= n <= 100:
                    passing_score = n
                    break

            if passing_score is None:
                passing_score = 70

            data.passing_score = passing_score

            # compute skill_category here so frontend/backend can use it
            skills = data.technical_skills or []
            role_txt = f"{data.role_context or ''} {data.role_details or ''}"
            data.skill_category = self._infer_skill_category(skills, role_txt)

            session.current_step = "review"

            instruction = (
                f"Note that the passing score is set to {passing_score}%. "
                "Now summarize the full planned assessment configuration from assessment_data: "
                "role context, key skills, assessment_type, difficulty, question categories and counts, "
                "time_limit and total_questions, passing_score. "
                "Ask the user to type 'confirm' to finalize or 'back' to adjust."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- review -> completed ---
        if step == "review":
            confirm_tokens = {"confirm", "yes", "create", "generate", "looks good", "ok"}
            if norm in confirm_tokens:
                session.current_step = "completed"
                data.status = "ready_for_generation"

                instruction = (
                    "The user confirmed. "
                    "Thank them, briefly restate the key parameters, "
                    "and say the system will now generate the concrete questions "
                    "based on this configuration."
                )
                reply = await self._llm_reply(instruction, session)
                return reply, True

            msg = (
                "If you want to change something, type 'back' to revisit a step, "
                "or 'confirm' to finalize this assessment setup."
            )
            return msg, False

        # --- completed ---
        if step == "completed":
            msg = (
                "This session is already completed ✅\n"
                "You can now use this configuration in your dashboard to generate an assessment. "
                "Type 'restart' if you’d like to design another one."
            )
            return msg, True

        # --- unknown state: reset ---
        session.current_step = "welcome"
        return (
            "I hit an unexpected state, so I restarted the flow. "
            "Please describe the role and what you want to assess.",
            False,
        )


# Singleton instance
chatbot_engine = ChatbotEngine()
