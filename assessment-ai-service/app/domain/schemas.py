from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from datetime import datetime
from uuid import uuid4

# =========================================================
# ============  BASE SHARED STRUCTURES  ====================
# =========================================================

class BaseAssessmentData(BaseModel):
    """
    Shared base schema for assessment-related data.

    Used by:
    - JD parsing results (SkillsAnalysis)
    - Final assessment configuration (AssessmentRequirements)
    """
    technical_skills: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    tools_platforms: List[str] = Field(default_factory=list)
    experience_level: Literal["entry", "mid", "senior", "executive"] = "mid"


# =========================================================
# ==========  JD PARSING & SKILLS ANALYSIS  ===============
# =========================================================

class QuestionRecommendation(BaseModel):
    """Suggested question distribution after skill analysis."""
    category: str
    count: int
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]


class SkillsAnalysis(BaseAssessmentData):
    """
    Rich analysis from JD parsing / skill extraction.

    This is an intermediate AI insight object:
    - drives UX
    - feeds into building AssessmentRequirements
    """
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    job_complexity: Literal["low", "medium", "high"] = "medium"
    primary_domain: str = "general"
    key_technologies: List[str] = Field(default_factory=list)
    question_recommendations: List[QuestionRecommendation] = Field(default_factory=list)

    # Optional inferred context
    job_type: Optional[Literal["full_time", "part_time", "contract", "internship"]] = None
    education_level: Optional[Literal["high_school", "bachelor", "master", "phd"]] = None
    remote_option: Optional[Literal["fully_remote", "hybrid", "office_only"]] = None
    department: Optional[str] = None
    suggested_department: Optional[str] = None
    education_recommendations: Optional[List[str]] = None


class EnhancedAssessmentData(BaseAssessmentData):
    """
    Compact snapshot stored with EmployerAssessment in Node/DB.
    Derived from SkillsAnalysis.
    """
    job_complexity: Literal["low", "medium", "high"]
    question_recommendations: List[QuestionRecommendation]


# =========================================================
# ================  JD PARSING API  =======================
# =========================================================

class SkillExtractionRequest(BaseModel):
    """Request to extract skills from a job description."""
    job_description: str
    job_title: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    department: Optional[str] = None


class SkillExtractionResponse(SkillsAnalysis):
    """Directly inherits all skill analysis fields."""
    pass


class JDParseRequest(BaseModel):
    """Request to analyze a job description."""
    job_description: str
    job_title: Optional[str] = None


class JDParseResponse(BaseModel):
    """
    Response for /jd/parse.

    - analysis: structured AI view of the JD (SkillsAnalysis)
    - requirements: raw grouped requirements (e.g. {"must_have": [...], "nice_to_have": [...]})
    """
    analysis: SkillsAnalysis
    requirements: Dict[str, List[str]]


# =========================================================
# =================  CHATBOT FLOW  =========================
# =========================================================

class ChatbotMessage(BaseModel):
    """A single message exchanged between user and chatbot."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: Literal["user", "assistant", "system"] = "user"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class ChatbotSession(BaseModel):
    """Represents an ongoing chatbot-guided assessment creation session."""
    session_id: str
    company_id: str
    job_id: Optional[str] = None
    messages: List[ChatbotMessage] = Field(default_factory=list)
    current_step: Literal[
        "welcome",
        "job_details",
        "skills_identification",
        "assessment_type",
        "difficulty_level",
        "question_types",
        "time_settings",
        "review",
        "completed",
    ] = "welcome"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Free-form working state while conversation is in progress
    assessment_data: Optional[Dict[str, Any]] = None
    method: Literal["chatbot_guided"] = "chatbot_guided"


class ChatbotStartRequest(BaseModel):
    """Start a new chatbot session."""
    company_id: str
    job_id: Optional[str] = None
    initial_data: Optional[Dict[str, Any]] = None


class ChatbotMessageRequest(BaseModel):
    """Send a message to an existing chatbot session."""
    session_id: str
    message: str


class ChatbotResponse(BaseModel):
    """
    Chatbot response payload for both /start and /message.

    When is_completed = True, the engine should be able to
    produce a final AssessmentRequirements for persistence.
    """
    session: ChatbotSession
    reply: str
    is_completed: bool = False


# =========================================================
# ===============  SKILL RADAR ENGINE  ====================
# =========================================================

class TestCaseBreakdown(BaseModel):
    """Summarized test-case performance."""
    total: int
    passed: int
    avg_time_ms: Optional[float] = None


class SkillObservation(BaseModel):
    """Single skill performance sample from candidate submission."""
    skill: str
    question_weight: float = 1.0
    correctness: float = Field(..., ge=0.0, le=1.0)
    time_penalty: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp: float = Field(..., description="UNIX timestamp in seconds.")


class SubmissionSignal(BaseModel):
    """Aggregated candidate submission report (from Youssra)."""
    candidate_id: str
    submission_id: str
    skills: List[SkillObservation]
    testcases: Optional[TestCaseBreakdown] = None


class RadarVector(BaseModel):
    """Radar vector summarizing candidate skills."""
    candidate_id: str
    scores: Dict[str, float]
    updated_at: float = Field(..., description="UNIX timestamp in seconds.")


class SkillRadarUpdateRequest(BaseModel):
    """Request to update a candidate’s radar vector."""
    signal: SubmissionSignal


class SkillRadarUpdateResponse(BaseModel):
    """Response after radar update."""
    candidate_id: str
    radar_vector: RadarVector
    updated_skills: List[str]


# =========================================================
# ============  ASSESSMENT REQUIREMENTS  ==================
# =========================================================

class AssessmentRequirements(BaseAssessmentData):
    """
    Canonical assessment configuration.

    This is the normalized shape consumed by:
    - Node EmployerAssessment service (to create EmployerAssessment row)
    - Wafaa (question generation)
    - Youssra (execution/grading context)

    It can be built from:
    - JD parsing (SkillsAnalysis + choices/defaults)
    - Chatbot-guided flow
    """
    job_title: str
    job_description: str
    assessment_type: Literal[
        "QUICK_CHECK",
        "COMPREHENSIVE",
        "CERTIFICATION",
        "COMPANY_SPECIFIC",
    ]
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
    time_limit: int
    total_questions: int
    question_categories: List[str]
    custom_weights: Dict[str, float] = Field(default_factory=dict)
    exclude_categories: List[str] = Field(default_factory=list)
    specific_requirements: List[str] = Field(default_factory=list)


# =========================================================
# ============  UNIFIED WRAPPER (OPTIONAL)  ==============
# =========================================================

class UnifiedAssessmentResponse(BaseModel):
    """
    Stable, backend-friendly wrapper if you want a single endpoint.

    - `requirements` is ALWAYS the final normalized config
      (maps directly to EmployerAssessment fields in Node).
    - `source` indicates which flow produced it.
    - `analysis` is optional extra context (typically for jd_parse).
    """
    source: Literal["jd_parse", "chatbot"]
    requirements: AssessmentRequirements
    analysis: Optional[SkillsAnalysis] = None
