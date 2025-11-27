from uuid import uuid4
from datetime import datetime
from typing import Dict, Tuple, List, Optional

from app.domain.schemas import (
    ChatbotSession,
    ChatbotMessage,
    ChatbotResponse,
    ChatbotStartRequest,
)
from app.services.llm.gemini_client import gemini_client


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
        "job_details",          # high-level role / context (not JD parse)
        "skills_identification",# what skills + focus (%)
        "assessment_type",      # QUICK_CHECK / COMPREHENSIVE / ...
        "difficulty_level",     # BEGINNER / INTERMEDIATE / ...
        "question_types",       # categories: coding, mcq, etc.
        "time_settings",        # time_limit + total_questions
        "review",               # summary + confirm
        "completed",
    ]

    def __init__(self) -> None:
        # In-memory for now; swap with Redis/DB in production
        self.sessions: Dict[str, ChatbotSession] = {}

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

    def _get_session(self, session_id: str) -> ChatbotSession:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        return session

    def _normalize(self, text: str) -> str:
        return (text or "").strip().lower()

    def _go_back_step(self, current_step: str) -> str:
        if current_step not in self.STEP_ORDER:
            return "welcome"
        idx = self.STEP_ORDER.index(current_step)
        if idx <= 0:
            return "welcome"
        return self.STEP_ORDER[idx - 1]

    def _build_context(self, session: ChatbotSession) -> Dict:
        """
        Context passed to Gemini so it can respond consistently.
        No business decisions here.
        """
        return {
            "session_id": session.session_id,
            "company_id": session.company_id,
            "job_id": session.job_id,
            "current_step": session.current_step,
            "assessment_data": session.assessment_data or {},
        }

    def _history_as_dicts(self, session: ChatbotSession) -> List[Dict]:
        return [
            {"type": m.type, "content": m.content}
            for m in session.messages
        ]

    async def _llm_reply(
        self,
        instruction: str,
        session: ChatbotSession,
        extra_context: Optional[Dict] = None,
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

        session = ChatbotSession(
            session_id=session_id,
            company_id=request.company_id,
            job_id=request.job_id,
            messages=[welcome_msg],
            current_step="welcome",
            created_at=self._now(),
            updated_at=self._now(),
            assessment_data=request.initial_data or {},
            method="chatbot_guided",
        )

        self.sessions[session_id] = session
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
        session = self._get_session(session_id)

        # Append user message
        session.messages.append(self._create_message(user_message, "user"))

        norm = self._normalize(user_message)

        # Global commands (deterministic)
        if norm in {"restart", "/restart", "reset", "start over"}:
            reply = await self._handle_restart(session)
            session.messages.append(self._create_message(reply, "assistant"))
            session.updated_at = self._now()
            return ChatbotResponse(session=session, reply=reply, is_completed=False)

        if norm in {"back", "/back"}:
            reply = await self._handle_back(session)
            session.messages.append(self._create_message(reply, "assistant"))
            session.updated_at = self._now()
            return ChatbotResponse(session=session, reply=reply, is_completed=False)

        # Normal step-based handling
        reply, is_completed = await self._handle_step(session, user_message)

        session.messages.append(self._create_message(reply, "assistant"))
        session.updated_at = self._now()

        return ChatbotResponse(session=session, reply=reply, is_completed=is_completed)

    # =============== Commands ===============

    async def _handle_restart(self, session: ChatbotSession) -> str:
        session.current_step = "welcome"
        session.assessment_data = {}
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

        # --- welcome -> job_details ---
        if step == "welcome":
            # Store high-level role context
            session.assessment_data = session.assessment_data or {}
            session.assessment_data["role_context"] = user_message.strip()
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
            # Capture extra context about responsibilities
            session.assessment_data["role_details"] = user_message.strip()
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
            # If user writes a distribution or list, store it
            if "technical_skills" not in (session.assessment_data or {}):
                session.assessment_data["technical_skills"] = []

            # naive capture; parsing can be improved later
            session.assessment_data["skills_raw_input"] = user_message.strip()

            # (Optionally: parse comma/line-separated skills into a list)
            approx_skills = [
                s.strip()
                for s in user_message.replace("\n", ",").split(",")
                if s.strip()
            ]
            if approx_skills:
                session.assessment_data["technical_skills"] = approx_skills

            # Move on when user seems done or just always step forward
            confirm_tokens = {
                "ok",
                "done",
                "next",
                "continue",
                "yes",
                "proceed",
                "looks good",
            }
            if norm in confirm_tokens:
                # Already handled but here norm is the message itself,
                # in real usage they'll say list + 'next' later. Keep it simple for now.
                pass

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

            session.assessment_data["assessment_type"] = selected
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

            session.assessment_data["difficulty"] = selected
            session.current_step = "question_types"

            instruction = (
                "Now ask the user which question types they want to include and in what proportion. "
                "Options: coding, mcq, debugging, system_design, architecture, etc. "
                "Encourage answers like '70% coding, 30% MCQ'."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- question_types -> time_settings ---
        if step == "question_types":
            session.assessment_data["question_types_raw"] = user_message.strip()
            # (Later you can parse into structured weights/categories)

            session.current_step = "time_settings"

            instruction = (
                "Thank the user for specifying question types. "
                "Now ask them for the total duration (in minutes) and approximate number of questions "
                "they want in this assessment."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- time_settings -> review ---
        if step == "time_settings":
            # Very simple parse: try to extract ints
            import re

            numbers = [int(n) for n in re.findall(r"\d+", user_message)]
            time_limit = numbers[0] if numbers else 60
            total_questions = numbers[1] if len(numbers) > 1 else 20

            session.assessment_data["time_limit"] = time_limit
            session.assessment_data["total_questions"] = total_questions

            session.current_step = "review"

            instruction = (
                "Summarize the full planned assessment configuration from assessment_data: "
                "role context, key skills, assessment_type, difficulty, question types idea, "
                f"time_limit={time_limit}, total_questions={total_questions}. "
                "Ask the user to type 'confirm' to finalize or 'back' to adjust."
            )
            reply = await self._llm_reply(instruction, session)
            return reply, False

        # --- review -> completed ---
        if step == "review":
            confirm_tokens = {"confirm", "yes", "create", "generate", "looks good", "ok"}
            if norm in confirm_tokens:
                session.current_step = "completed"
                session.assessment_data["status"] = "ready_for_generation"

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
